import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { 
  Package, 
  Plus, 
  Pencil, 
  Trash2, 
  Crown, 
  Check,
  X,
  CreditCard,
  Users,
  Activity,
  MessageSquare,
  Zap,
  Star,
  Settings2,
  Lock,
  Eye,
  EyeOff,
  Shield,
  FileText,
  Save,
  RefreshCw,
  Mail,
  AlertCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Megaphone,
  Building2,
  BarChart3,
  Radio,
  Ban,
  PlayCircle
} from "lucide-react";
import type { SubscriptionPlan, Subscription, SubscriptionPayment } from "@shared/schema";

// Uses server-side authentication - no password stored client-side

const FEATURE_OPTIONS = [
  { key: "basic_calendar", label: "Temel Takvim", icon: Activity },
  { key: "manual_reservations", label: "Manuel Rezervasyon", icon: Plus },
  { key: "whatsapp_notifications", label: "WhatsApp Bildirim", icon: MessageSquare },
  { key: "basic_reports", label: "Temel Raporlar", icon: Activity },
  { key: "advanced_reports", label: "Gelişmiş Raporlar", icon: Activity },
  { key: "ai_bot", label: "AI Bot", icon: Zap },
  { key: "woocommerce", label: "WooCommerce", icon: CreditCard },
  { key: "package_tours", label: "Paket Turlar", icon: Package },
  { key: "api_access", label: "API Erişimi", icon: Settings2 },
  { key: "priority_support", label: "Öncelikli Destek", icon: Star },
  { key: "custom_branding", label: "Özel Marka", icon: Crown },
];

const DEFAULT_BOT_RULES = `1. Her zaman nazik ve profesyonel ol.
2. Müşterilere aktivite bilgilerini doğru ver.
3. Fiyat sorularına net cevap ver.
4. Rezervasyon taleplerinde tarih, saat ve kişi sayısını sor.
5. Karmaşık konularda yetkiliye yönlendir.`;

interface SystemLog {
  id: number;
  level: string;
  source: string;
  message: string;
  details: string | null;
  phone: string | null;
  createdAt: string;
}

interface License {
  id: number;
  companyName: string;
  ownerName: string | null;
  email: string | null;
  isActive: boolean;
  expiryDate: string | null;
  createdAt: string | null;
}

interface Announcement {
  id: number;
  title: string;
  content: string;
  type: string;
  targetAudience: string;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string | null;
}

interface PlatformAnalytics {
  totalAgencies: number;
  activeAgencies: number;
  trialAgencies: number;
  paidAgencies: number;
  mrrTl: number;
  mrrUsd: number;
  churnRate: number;
  totalReservationsThisMonth: number;
  avgReservationsPerAgency: number;
}

interface WhatsAppStats {
  totalMessagesThisMonth: number;
  userMessages: number;
  botResponses: number;
  escalatedConversations: number;
  escalationRate: number;
  uniqueCustomers: number;
  avgResponseTimeMs: number;
  botSuccessRate: number;
}

function AgenciesSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: licenses = [], isLoading } = useQuery<License[]>({
    queryKey: ['/api/licenses'],
  });

  const suspendMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/licenses/${id}/suspend`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/licenses'] });
      toast({ title: "Basarili", description: "Lisans askiya alindi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Lisans askiya alinamadi.", variant: "destructive" });
    }
  });

  const activateMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/licenses/${id}/activate`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/licenses'] });
      toast({ title: "Basarili", description: "Lisans aktif edildi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Lisans aktif edilemedi.", variant: "destructive" });
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Ajans Yonetimi
        </CardTitle>
        <CardDescription>Tum ajanslari ve lisanslarini yonetin</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Yukleniyor...</div>
        ) : licenses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Henuz ajans bulunmuyor.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Sirket Adi</TableHead>
                <TableHead>Sahip</TableHead>
                <TableHead>E-posta</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Son Kullanma</TableHead>
                <TableHead>Islemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {licenses.map((lic) => (
                <TableRow key={lic.id} data-testid={`row-license-${lic.id}`}>
                  <TableCell>{lic.id}</TableCell>
                  <TableCell className="font-medium">{lic.companyName}</TableCell>
                  <TableCell>{lic.ownerName || "-"}</TableCell>
                  <TableCell>{lic.email || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={lic.isActive ? "default" : "destructive"}>
                      {lic.isActive ? "Aktif" : "Askida"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {lic.expiryDate ? new Date(lic.expiryDate).toLocaleDateString("tr-TR") : "-"}
                  </TableCell>
                  <TableCell>
                    {lic.isActive ? (
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => suspendMutation.mutate(lic.id)}
                        disabled={suspendMutation.isPending}
                        data-testid={`button-suspend-${lic.id}`}
                      >
                        <Ban className="h-4 w-4 mr-1" />
                        Askiya Al
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => activateMutation.mutate(lic.id)}
                        disabled={activateMutation.isPending}
                        data-testid={`button-activate-${lic.id}`}
                      >
                        <PlayCircle className="h-4 w-4 mr-1" />
                        Aktif Et
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function AnnouncementsSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newAnnouncement, setNewAnnouncement] = useState({ title: "", content: "", type: "info" });
  
  const { data: announcements = [], isLoading } = useQuery<Announcement[]>({
    queryKey: ['/api/announcements'],
  });

  const createMutation = useMutation({
    mutationFn: (data: { title: string; content: string; type: string }) => 
      apiRequest('/api/announcements', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/announcements'] });
      setNewAnnouncement({ title: "", content: "", type: "info" });
      toast({ title: "Basarili", description: "Duyuru olusturuldu." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Duyuru olusturulamadi.", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/announcements/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/announcements'] });
      toast({ title: "Basarili", description: "Duyuru silindi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Duyuru silinemedi.", variant: "destructive" });
    }
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Yeni Duyuru Olustur
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Baslik</Label>
              <Input 
                value={newAnnouncement.title}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                placeholder="Duyuru basligi..."
                data-testid="input-announcement-title"
              />
            </div>
            <div className="space-y-2">
              <Label>Tur</Label>
              <select 
                className="w-full h-9 px-3 rounded-md border bg-background"
                value={newAnnouncement.type}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, type: e.target.value })}
                data-testid="select-announcement-type"
              >
                <option value="info">Bilgi</option>
                <option value="warning">Uyari</option>
                <option value="maintenance">Bakim</option>
                <option value="update">Guncelleme</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Icerik</Label>
            <Textarea
              value={newAnnouncement.content}
              onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
              placeholder="Duyuru icerigi..."
              data-testid="textarea-announcement-content"
            />
          </div>
          <Button 
            onClick={() => createMutation.mutate(newAnnouncement)}
            disabled={!newAnnouncement.title || !newAnnouncement.content || createMutation.isPending}
            data-testid="button-create-announcement"
          >
            <Plus className="h-4 w-4 mr-2" />
            Duyuru Olustur
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mevcut Duyurular</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Yukleniyor...</div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Henuz duyuru bulunmuyor.</div>
          ) : (
            <div className="space-y-3">
              {announcements.map((ann) => (
                <div 
                  key={ann.id} 
                  className="flex items-start justify-between gap-4 p-3 border rounded-lg"
                  data-testid={`card-announcement-${ann.id}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={ann.type === "warning" ? "destructive" : ann.type === "maintenance" ? "secondary" : "outline"}>
                        {ann.type === "info" ? "Bilgi" : ann.type === "warning" ? "Uyari" : ann.type === "maintenance" ? "Bakim" : "Guncelleme"}
                      </Badge>
                      <span className="font-medium">{ann.title}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{ann.content}</p>
                    <span className="text-xs text-muted-foreground">
                      {ann.createdAt ? new Date(ann.createdAt).toLocaleString("tr-TR") : "-"}
                    </span>
                  </div>
                  <Button 
                    size="icon" 
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(ann.id)}
                    data-testid={`button-delete-announcement-${ann.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AnalyticsSection() {
  const { data: platformAnalytics, isLoading: platformLoading } = useQuery<PlatformAnalytics>({
    queryKey: ['/api/analytics/platform'],
  });

  const { data: whatsappStats, isLoading: whatsappLoading } = useQuery<WhatsAppStats>({
    queryKey: ['/api/analytics/whatsapp'],
  });

  const formatCurrency = (amount: number, currency: string) => {
    return currency === "TL" 
      ? `${(amount / 100).toFixed(2)} TL`
      : `$${(amount / 100).toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Platform Analitikleri
          </CardTitle>
          <CardDescription>Genel platform istatistikleri</CardDescription>
        </CardHeader>
        <CardContent>
          {platformLoading ? (
            <div className="text-center py-8 text-muted-foreground">Yukleniyor...</div>
          ) : platformAnalytics ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-bold">{platformAnalytics.totalAgencies}</div>
                <div className="text-sm text-muted-foreground">Toplam Ajans</div>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">{platformAnalytics.activeAgencies}</div>
                <div className="text-sm text-muted-foreground">Aktif Ajans</div>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">{platformAnalytics.trialAgencies}</div>
                <div className="text-sm text-muted-foreground">Deneme Surecinde</div>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-bold text-primary">{platformAnalytics.paidAgencies}</div>
                <div className="text-sm text-muted-foreground">Odeme Yapan</div>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-bold">{formatCurrency(platformAnalytics.mrrTl, "TL")}</div>
                <div className="text-sm text-muted-foreground">Aylik Gelir (TL)</div>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-bold">{formatCurrency(platformAnalytics.mrrUsd, "USD")}</div>
                <div className="text-sm text-muted-foreground">Aylik Gelir (USD)</div>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-bold">{platformAnalytics.totalReservationsThisMonth}</div>
                <div className="text-sm text-muted-foreground">Bu Ay Rezervasyon</div>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-bold">{platformAnalytics.avgReservationsPerAgency}</div>
                <div className="text-sm text-muted-foreground">Ortalama/Ajans</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">Veri yok</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            WhatsApp Istatistikleri
          </CardTitle>
          <CardDescription>Son 30 gunluk WhatsApp mesaj istatistikleri</CardDescription>
        </CardHeader>
        <CardContent>
          {whatsappLoading ? (
            <div className="text-center py-8 text-muted-foreground">Yukleniyor...</div>
          ) : whatsappStats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-bold">{whatsappStats.totalMessagesThisMonth}</div>
                <div className="text-sm text-muted-foreground">Toplam Mesaj</div>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">{whatsappStats.userMessages}</div>
                <div className="text-sm text-muted-foreground">Musteri Mesaji</div>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">{whatsappStats.botResponses}</div>
                <div className="text-sm text-muted-foreground">Bot Yaniti</div>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-bold text-orange-600">{whatsappStats.escalatedConversations}</div>
                <div className="text-sm text-muted-foreground">Yonlendirilen</div>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-bold">{whatsappStats.escalationRate}%</div>
                <div className="text-sm text-muted-foreground">Yonlendirme Orani</div>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-bold">{whatsappStats.uniqueCustomers}</div>
                <div className="text-sm text-muted-foreground">Benzersiz Musteri</div>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-bold">{whatsappStats.avgResponseTimeMs}ms</div>
                <div className="text-sm text-muted-foreground">Ort. Yanit Suresi</div>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">{whatsappStats.botSuccessRate.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Bot Basari Orani</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">Veri yok</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SuperAdmin() {
  const { toast } = useToast();
  
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  // Plan management state
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [isNewPlan, setIsNewPlan] = useState(false);
  const [planForm, setPlanForm] = useState<Partial<SubscriptionPlan>>({});
  
  // Developer section state
  const [botRules, setBotRules] = useState(DEFAULT_BOT_RULES);
  const [isSavingRules, setIsSavingRules] = useState(false);
  const [developerEmail, setDeveloperEmail] = useState("logobudur@gmail.com");
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  // Check for existing session token
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
        toast({ title: "Giriş Başarılı", description: "Süper Admin paneline hoş geldiniz." });
      } else {
        toast({ title: "Hata", description: data.error || "Şifre yanlış", variant: "destructive" });
      }
    } catch {
      toast({ title: "Hata", description: "Giriş yapılamadı", variant: "destructive" });
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('superAdminToken');
    setPassword("");
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
      console.error("Bot rules yüklenemedi:", err);
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
      
      toast({ title: "Kaydedildi", description: "Ayarlar başarıyla kaydedildi." });
    } catch {
      toast({ title: "Hata", description: "Ayarlar kaydedilemedi", variant: "destructive" });
    } finally {
      setIsSavingRules(false);
    }
  };

  const { data: plans = [], isLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscription-plans"],
  });

  const { data: subscriptionsData = [] } = useQuery<Subscription[]>({
    queryKey: ["/api/subscriptions"],
  });

  const { data: paymentsData = [] } = useQuery<SubscriptionPayment[]>({
    queryKey: ["/api/subscription-payments"],
  });

  // System logs query
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

  // Developer email query
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

  const createPlanMutation = useMutation({
    mutationFn: async (plan: Partial<SubscriptionPlan>) => {
      return apiRequest("POST", "/api/subscription-plans", plan);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] });
      toast({ title: "Başarılı", description: "Plan oluşturuldu." });
      setEditingPlan(null);
      setIsNewPlan(false);
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: async ({ id, ...plan }: Partial<SubscriptionPlan> & { id: number }) => {
      return apiRequest("PATCH", `/api/subscription-plans/${id}`, plan);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] });
      toast({ title: "Başarılı", description: "Plan güncellendi." });
      setEditingPlan(null);
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/subscription-plans/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] });
      toast({ title: "Başarılı", description: "Plan silindi." });
    },
  });

  const openEditDialog = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setPlanForm({ ...plan });
    setIsNewPlan(false);
  };

  const openNewDialog = () => {
    setEditingPlan({} as SubscriptionPlan);
    setPlanForm({
      code: "",
      name: "",
      description: "",
      priceTl: 0,
      priceUsd: 0,
      yearlyPriceTl: 0,
      yearlyPriceUsd: 0,
      yearlyDiscountPct: 20,
      trialDays: 0,
      maxActivities: 5,
      maxReservationsPerMonth: 100,
      maxUsers: 1,
      maxWhatsappNumbers: 1,
      features: "[]",
      sortOrder: plans.length,
      isActive: true,
      isPopular: false,
    });
    setIsNewPlan(true);
  };

  const handleSave = () => {
    if (isNewPlan) {
      createPlanMutation.mutate(planForm);
    } else if (editingPlan?.id) {
      updatePlanMutation.mutate({ id: editingPlan.id, ...planForm });
    }
  };

  const toggleFeature = (featureKey: string) => {
    const currentFeatures = JSON.parse(planForm.features || "[]");
    const newFeatures = currentFeatures.includes(featureKey)
      ? currentFeatures.filter((f: string) => f !== featureKey)
      : [...currentFeatures, featureKey];
    setPlanForm({ ...planForm, features: JSON.stringify(newFeatures) });
  };

  const formatPrice = (amount: number | null | undefined) => {
    if (!amount) return "0";
    return (amount / 100).toLocaleString("tr-TR");
  };

  const getPlanFeatures = (plan: SubscriptionPlan) => {
    try {
      return JSON.parse(plan.features || "[]");
    } catch {
      return [];
    }
  };

  // Loading state
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20">
        <div className="text-muted-foreground">Yükleniyor...</div>
      </div>
    );
  }

  // Login form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <CardTitle>Süper Admin Girişi</CardTitle>
            <CardDescription>
              Bu panele erişmek için şifrenizi girin
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
                    data-testid="input-super-admin-password"
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
              <Button type="submit" className="w-full" data-testid="button-super-admin-login">
                Giriş Yap
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Crown className="h-6 w-6 text-primary" />
            Süper Admin
          </h1>
          <p className="text-muted-foreground">Abonelik planları ve sistem yönetimi</p>
        </div>
        <Button variant="ghost" onClick={handleLogout} data-testid="button-super-admin-logout">
          Çıkış
        </Button>
      </div>

      <Tabs defaultValue="plans">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="plans" data-testid="tab-plans">
            <Package className="h-4 w-4 mr-2" />
            Planlar
          </TabsTrigger>
          <TabsTrigger value="subscriptions" data-testid="tab-subscriptions">
            <Users className="h-4 w-4 mr-2" />
            Abonelikler
          </TabsTrigger>
          <TabsTrigger value="payments" data-testid="tab-payments">
            <CreditCard className="h-4 w-4 mr-2" />
            Ödemeler
          </TabsTrigger>
          <TabsTrigger value="agencies" data-testid="tab-agencies">
            <Building2 className="h-4 w-4 mr-2" />
            Ajanslar
          </TabsTrigger>
          <TabsTrigger value="announcements" data-testid="tab-announcements">
            <Megaphone className="h-4 w-4 mr-2" />
            Duyurular
          </TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analitik
          </TabsTrigger>
          <TabsTrigger value="developer" data-testid="tab-developer">
            <Shield className="h-4 w-4 mr-2" />
            Geliştirici
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={openNewDialog} data-testid="button-new-plan">
              <Plus className="h-4 w-4 mr-2" />
              Yeni Plan
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {plans.map((plan) => (
                <Card 
                  key={plan.id} 
                  className={`relative ${plan.isPopular ? "border-primary border-2" : ""} ${!plan.isActive ? "opacity-60" : ""}`}
                  data-testid={`card-plan-${plan.id}`}
                >
                  {plan.isPopular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Star className="h-3 w-3 mr-1" />
                      En Popüler
                    </Badge>
                  )}
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <div className="flex items-center gap-1">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => openEditDialog(plan)}
                          data-testid={`button-edit-plan-${plan.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => deletePlanMutation.mutate(plan.id)}
                          data-testid={`button-delete-plan-${plan.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="text-2xl font-bold">
                        {formatPrice(plan.priceTl)} TL
                        <span className="text-sm font-normal text-muted-foreground">/ay</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        ${formatPrice(plan.priceUsd)}/ay
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        <span>{plan.maxActivities === 9999 ? "Sınırsız" : plan.maxActivities} aktivite</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{plan.maxReservationsPerMonth === 99999 ? "Sınırsız" : plan.maxReservationsPerMonth} rez./ay</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <span>{plan.maxWhatsappNumbers} WhatsApp</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t space-y-1">
                      {getPlanFeatures(plan).slice(0, 4).map((f: string) => {
                        const feature = FEATURE_OPTIONS.find((o) => o.key === f);
                        return feature ? (
                          <div key={f} className="flex items-center gap-2 text-xs">
                            <Check className="h-3 w-3 text-green-600" />
                            <span>{feature.label}</span>
                          </div>
                        ) : null;
                      })}
                      {getPlanFeatures(plan).length > 4 && (
                        <div className="text-xs text-muted-foreground">
                          +{getPlanFeatures(plan).length - 4} daha fazla
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <Badge variant={plan.isActive ? "default" : "secondary"}>
                        {plan.isActive ? "Aktif" : "Pasif"}
                      </Badge>
                      <Badge variant="outline">{plan.code}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="subscriptions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Aktif Abonelikler</CardTitle>
              <CardDescription>Sistemdeki tüm acenta abonelikleri</CardDescription>
            </CardHeader>
            <CardContent>
              {subscriptionsData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Henüz abonelik bulunmuyor.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead>Dönem</TableHead>
                      <TableHead>Sonraki Ödeme</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptionsData.map((sub) => (
                      <TableRow key={sub.id} data-testid={`row-subscription-${sub.id}`}>
                        <TableCell>{sub.id}</TableCell>
                        <TableCell>
                          {plans.find((p) => p.id === sub.planId)?.name || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={sub.status === "active" ? "default" : sub.status === "trial" ? "secondary" : "destructive"}>
                            {sub.status === "active" ? "Aktif" : 
                             sub.status === "trial" ? "Deneme" : 
                             sub.status === "cancelled" ? "İptal" : sub.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{sub.billingCycle === "yearly" ? "Yıllık" : "Aylık"}</TableCell>
                        <TableCell>
                          {sub.nextPaymentAt ? new Date(sub.nextPaymentAt).toLocaleDateString("tr-TR") : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Ödeme Geçmişi</CardTitle>
              <CardDescription>Tüm abonelik ödemeleri</CardDescription>
            </CardHeader>
            <CardContent>
              {paymentsData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Henüz ödeme bulunmuyor.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Abonelik</TableHead>
                      <TableHead>Tutar</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead>Tarih</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentsData.map((payment) => (
                      <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                        <TableCell>{payment.id}</TableCell>
                        <TableCell>#{payment.subscriptionId}</TableCell>
                        <TableCell>
                          {payment.currency === "TRY" 
                            ? `${formatPrice(payment.amountTl)} TL`
                            : `$${formatPrice(payment.amountUsd)}`}
                        </TableCell>
                        <TableCell>
                          <Badge variant={payment.status === "completed" ? "default" : payment.status === "pending" ? "secondary" : "destructive"}>
                            {payment.status === "completed" ? "Tamamlandı" : 
                             payment.status === "pending" ? "Beklemede" : 
                             payment.status === "failed" ? "Başarısız" : payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString("tr-TR") : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Agencies Tab */}
        <TabsContent value="agencies" className="space-y-4 mt-4">
          <AgenciesSection />
        </TabsContent>

        {/* Announcements Tab */}
        <TabsContent value="announcements" className="space-y-4 mt-4">
          <AnnouncementsSection />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4 mt-4">
          <AnalyticsSection />
        </TabsContent>

        {/* Developer Tab */}
        <TabsContent value="developer" className="space-y-4 mt-4">
          {/* Developer Email */}
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
              </div>
            </CardContent>
          </Card>

          {/* Bot Rules */}
          <Card>
            <CardHeader>
              <CardTitle>AI Bot Kuralları</CardTitle>
              <CardDescription>
                Bu kurallar bot'un sistem prompt'una eklenir ve her mesajda geçerli olur.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={botRules}
                onChange={(e) => setBotRules(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
                placeholder="Bot kurallarını buraya yazın..."
                data-testid="textarea-bot-rules"
              />

              <div className="flex justify-end">
                <Button 
                  onClick={handleSaveRules} 
                  disabled={isSavingRules}
                  data-testid="button-save-rules"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSavingRules ? "Kaydediliyor..." : "Ayarları Kaydet"}
                </Button>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">İpuçları</h4>
                <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                  <li>Her kuralı numaralandırarak yazın (1., 2., 3. gibi)</li>
                  <li>Kurallar net ve açık olmalı</li>
                  <li>Bot bu kurallara göre müşteri mesajlarını yanıtlar</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* System Logs */}
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
        </TabsContent>
      </Tabs>

      <Dialog open={!!editingPlan} onOpenChange={(open) => !open && setEditingPlan(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{isNewPlan ? "Yeni Plan Oluştur" : "Planı Düzenle"}</DialogTitle>
            <DialogDescription>
              Abonelik planının özelliklerini ve limitlerini ayarlayın.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Plan Kodu</Label>
                <Input
                  id="code"
                  value={planForm.code || ""}
                  onChange={(e) => setPlanForm({ ...planForm, code: e.target.value })}
                  placeholder="basic"
                  data-testid="input-plan-code"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Plan Adı</Label>
                <Input
                  id="name"
                  value={planForm.name || ""}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  placeholder="Basic"
                  data-testid="input-plan-name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Açıklama</Label>
              <Textarea
                id="description"
                value={planForm.description || ""}
                onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                placeholder="Plan açıklaması..."
                data-testid="input-plan-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priceTl">Aylık Fiyat (TL kuruş)</Label>
                <Input
                  id="priceTl"
                  type="number"
                  value={planForm.priceTl || 0}
                  onChange={(e) => setPlanForm({ ...planForm, priceTl: Number(e.target.value) })}
                  data-testid="input-plan-price-tl"
                />
                <p className="text-xs text-muted-foreground">= {formatPrice(planForm.priceTl)} TL</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priceUsd">Aylık Fiyat (USD cent)</Label>
                <Input
                  id="priceUsd"
                  type="number"
                  value={planForm.priceUsd || 0}
                  onChange={(e) => setPlanForm({ ...planForm, priceUsd: Number(e.target.value) })}
                  data-testid="input-plan-price-usd"
                />
                <p className="text-xs text-muted-foreground">= ${formatPrice(planForm.priceUsd)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="yearlyPriceTl">Yıllık Fiyat (TL kuruş)</Label>
                <Input
                  id="yearlyPriceTl"
                  type="number"
                  value={planForm.yearlyPriceTl || 0}
                  onChange={(e) => setPlanForm({ ...planForm, yearlyPriceTl: Number(e.target.value) })}
                  data-testid="input-plan-yearly-price-tl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="yearlyDiscountPct">Yıllık İndirim (%)</Label>
                <Input
                  id="yearlyDiscountPct"
                  type="number"
                  value={planForm.yearlyDiscountPct || 0}
                  onChange={(e) => setPlanForm({ ...planForm, yearlyDiscountPct: Number(e.target.value) })}
                  data-testid="input-plan-yearly-discount"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxActivities">Max Aktivite</Label>
                <Input
                  id="maxActivities"
                  type="number"
                  value={planForm.maxActivities || 0}
                  onChange={(e) => setPlanForm({ ...planForm, maxActivities: Number(e.target.value) })}
                  data-testid="input-plan-max-activities"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxReservations">Max Rez./Ay</Label>
                <Input
                  id="maxReservations"
                  type="number"
                  value={planForm.maxReservationsPerMonth || 0}
                  onChange={(e) => setPlanForm({ ...planForm, maxReservationsPerMonth: Number(e.target.value) })}
                  data-testid="input-plan-max-reservations"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxUsers">Max Kullanıcı</Label>
                <Input
                  id="maxUsers"
                  type="number"
                  value={planForm.maxUsers || 0}
                  onChange={(e) => setPlanForm({ ...planForm, maxUsers: Number(e.target.value) })}
                  data-testid="input-plan-max-users"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxWhatsapp">Max WhatsApp</Label>
                <Input
                  id="maxWhatsapp"
                  type="number"
                  value={planForm.maxWhatsappNumbers || 0}
                  onChange={(e) => setPlanForm({ ...planForm, maxWhatsappNumbers: Number(e.target.value) })}
                  data-testid="input-plan-max-whatsapp"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Özellikler</Label>
              <div className="grid grid-cols-2 gap-2 p-3 border rounded-md">
                {FEATURE_OPTIONS.map((feature) => {
                  const isEnabled = JSON.parse(planForm.features || "[]").includes(feature.key);
                  return (
                    <div
                      key={feature.key}
                      className="flex items-center justify-between p-2 rounded hover-elevate cursor-pointer"
                      onClick={() => toggleFeature(feature.key)}
                      data-testid={`toggle-feature-${feature.key}`}
                    >
                      <div className="flex items-center gap-2">
                        <feature.icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{feature.label}</span>
                      </div>
                      {isEnabled ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-md">
                <Label htmlFor="isActive">Aktif</Label>
                <Switch
                  id="isActive"
                  checked={planForm.isActive ?? true}
                  onCheckedChange={(checked) => setPlanForm({ ...planForm, isActive: checked })}
                  data-testid="switch-plan-active"
                />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-md">
                <Label htmlFor="isPopular">En Popüler</Label>
                <Switch
                  id="isPopular"
                  checked={planForm.isPopular ?? false}
                  onCheckedChange={(checked) => setPlanForm({ ...planForm, isPopular: checked })}
                  data-testid="switch-plan-popular"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPlan(null)}>
              İptal
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={createPlanMutation.isPending || updatePlanMutation.isPending}
              data-testid="button-save-plan"
            >
              {createPlanMutation.isPending || updatePlanMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
