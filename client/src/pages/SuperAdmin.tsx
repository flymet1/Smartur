import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
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
  PlayCircle,
  Receipt,
  Wifi,
  WifiOff,
  CheckCircle,
  Clock,
  XCircle,
  HelpCircle,
  Upload,
  Download,
  Server,
  GitBranch,
  RotateCcw,
  History,
  UserCog,
  LogIn,
  Layers,
  Database,
  HeadphonesIcon,
  DollarSign,
  TrendingUp,
  CalendarDays,
  Cpu,
  HardDrive
} from "lucide-react";
import type { SubscriptionPlan, Subscription, SubscriptionPayment, PlanFeature } from "@shared/schema";

// Uses server-side authentication - no password stored client-side

// Icon registry - maps stored icon string names to actual lucide components
const ICON_REGISTRY: Record<string, React.ComponentType<{ className?: string }>> = {
  Activity,
  Plus,
  MessageSquare,
  Zap,
  CreditCard,
  Package,
  Settings2,
  Star,
  Crown,
  Users,
  BarChart3,
  Shield,
  FileText,
  Mail,
  RefreshCw,
  CheckCircle,
  Clock,
  HelpCircle,
  Info,
  AlertCircle,
  AlertTriangle,
  Building2,
  Receipt,
  Radio,
  Wifi,
  Lock,
  Eye,
};

// Helper function to get icon component from icon string name
const getIconComponent = (iconName: string | null | undefined): React.ComponentType<{ className?: string }> => {
  if (!iconName) return Star;
  return ICON_REGISTRY[iconName] || Star;
};

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
    mutationFn: (id: number) => apiRequest('POST', `/api/licenses/${id}/suspend`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/licenses'] });
      toast({ title: "Basarili", description: "Lisans askiya alindi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Lisans askiya alinamadi.", variant: "destructive" });
    }
  });

  const activateMutation = useMutation({
    mutationFn: (id: number) => apiRequest('POST', `/api/licenses/${id}/activate`),
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
      apiRequest('POST', '/api/announcements', data),
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
    mutationFn: (id: number) => apiRequest('DELETE', `/api/announcements/${id}`),
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

function PlanFeaturesSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingFeature, setEditingFeature] = useState<PlanFeature | null>(null);
  const [newFeature, setNewFeature] = useState({ key: "", label: "", description: "", icon: "Star", category: "general" });
  const [showNewForm, setShowNewForm] = useState(false);

  const { data: features = [], isLoading } = useQuery<PlanFeature[]>({
    queryKey: ['/api/plan-features'],
  });

  const createMutation = useMutation({
    mutationFn: (data: { key: string; label: string; description: string; icon: string; category: string }) => 
      apiRequest('POST', '/api/plan-features', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/plan-features'] });
      setNewFeature({ key: "", label: "", description: "", icon: "Star", category: "general" });
      setShowNewForm(false);
      toast({ title: "Basarili", description: "Ozellik olusturuldu." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Ozellik olusturulamadi.", variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PlanFeature> }) => 
      apiRequest('PATCH', `/api/plan-features/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/plan-features'] });
      setEditingFeature(null);
      toast({ title: "Basarili", description: "Ozellik guncellendi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Ozellik guncellenemedi.", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/plan-features/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/plan-features'] });
      toast({ title: "Basarili", description: "Ozellik silindi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Ozellik silinemedi.", variant: "destructive" });
    }
  });

  const categoryLabels: Record<string, string> = {
    core: "Temel",
    communication: "Iletisim",
    analytics: "Analitik",
    automation: "Otomasyon",
    integration: "Entegrasyon",
    support: "Destek",
    customization: "Ozellestirme",
    general: "Genel"
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Plan Ozellikleri Yonetimi
            </CardTitle>
            <CardDescription>Planlara atanabilecek ozellikleri yonetin</CardDescription>
          </div>
          <Button onClick={() => setShowNewForm(!showNewForm)} data-testid="button-toggle-new-feature">
            <Plus className="h-4 w-4 mr-2" />
            Yeni Ozellik
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {showNewForm && (
            <div className="p-4 border rounded-lg space-y-4 bg-muted/30">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Anahtar (key)</Label>
                  <Input 
                    value={newFeature.key}
                    onChange={(e) => setNewFeature({ ...newFeature, key: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                    placeholder="ornek: ai_bot"
                    data-testid="input-new-feature-key"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Etiket</Label>
                  <Input 
                    value={newFeature.label}
                    onChange={(e) => setNewFeature({ ...newFeature, label: e.target.value })}
                    placeholder="AI Bot"
                    data-testid="input-new-feature-label"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ikon</Label>
                  <Input 
                    value={newFeature.icon}
                    onChange={(e) => setNewFeature({ ...newFeature, icon: e.target.value })}
                    placeholder="Star, Bot, Calendar..."
                    data-testid="input-new-feature-icon"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kategori</Label>
                  <select 
                    className="w-full h-9 px-3 rounded-md border bg-background"
                    value={newFeature.category}
                    onChange={(e) => setNewFeature({ ...newFeature, category: e.target.value })}
                    data-testid="select-new-feature-category"
                  >
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Aciklama</Label>
                <Textarea
                  value={newFeature.description}
                  onChange={(e) => setNewFeature({ ...newFeature, description: e.target.value })}
                  placeholder="Ozellik aciklamasi..."
                  data-testid="textarea-new-feature-description"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => createMutation.mutate(newFeature)}
                  disabled={!newFeature.key || !newFeature.label || createMutation.isPending}
                  data-testid="button-create-feature"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Olustur
                </Button>
                <Button variant="outline" onClick={() => setShowNewForm(false)}>
                  Iptal
                </Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Yukleniyor...</div>
          ) : features.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Henuz ozellik bulunmuyor.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Anahtar</TableHead>
                  <TableHead>Etiket</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Ikon</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Islemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {features.map((feature) => (
                  <TableRow key={feature.id} data-testid={`row-feature-${feature.id}`}>
                    <TableCell className="font-mono text-sm">{feature.key}</TableCell>
                    <TableCell className="font-medium">{feature.label}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{categoryLabels[feature.category || "general"]}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {(() => {
                        const IconComponent = getIconComponent(feature.icon);
                        return (
                          <div className="flex items-center gap-2">
                            <IconComponent className="h-4 w-4" />
                            <span className="text-xs">{feature.icon}</span>
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={feature.isActive ? "default" : "secondary"}>
                        {feature.isActive ? "Aktif" : "Pasif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => setEditingFeature(feature)}
                          data-testid={`button-edit-feature-${feature.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => updateMutation.mutate({ id: feature.id, data: { isActive: !feature.isActive } })}
                          data-testid={`button-toggle-feature-${feature.id}`}
                        >
                          {feature.isActive ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => deleteMutation.mutate(feature.id)}
                          data-testid={`button-delete-feature-${feature.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingFeature} onOpenChange={(open) => !open && setEditingFeature(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ozellik Duzenle</DialogTitle>
            <DialogDescription>Ozellik bilgilerini duzenleyin</DialogDescription>
          </DialogHeader>
          {editingFeature && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Anahtar (key)</Label>
                <Input 
                  value={editingFeature.key}
                  onChange={(e) => setEditingFeature({ ...editingFeature, key: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                  data-testid="input-edit-feature-key"
                />
              </div>
              <div className="space-y-2">
                <Label>Etiket</Label>
                <Input 
                  value={editingFeature.label}
                  onChange={(e) => setEditingFeature({ ...editingFeature, label: e.target.value })}
                  data-testid="input-edit-feature-label"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ikon</Label>
                  <Input 
                    value={editingFeature.icon || ""}
                    onChange={(e) => setEditingFeature({ ...editingFeature, icon: e.target.value })}
                    data-testid="input-edit-feature-icon"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kategori</Label>
                  <select 
                    className="w-full h-9 px-3 rounded-md border bg-background"
                    value={editingFeature.category || "general"}
                    onChange={(e) => setEditingFeature({ ...editingFeature, category: e.target.value })}
                    data-testid="select-edit-feature-category"
                  >
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Aciklama</Label>
                <Textarea
                  value={editingFeature.description || ""}
                  onChange={(e) => setEditingFeature({ ...editingFeature, description: e.target.value })}
                  data-testid="textarea-edit-feature-description"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingFeature(null)}>Iptal</Button>
            <Button 
              onClick={() => editingFeature && updateMutation.mutate({ 
                id: editingFeature.id, 
                data: { 
                  key: editingFeature.key,
                  label: editingFeature.label,
                  icon: editingFeature.icon,
                  category: editingFeature.category,
                  description: editingFeature.description 
                } 
              })}
              disabled={updateMutation.isPending}
              data-testid="button-save-feature"
            >
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

interface Invoice {
  id: number;
  subscriptionId: number;
  invoiceNumber: string;
  amountTl: number;
  amountUsd: number;
  currency: string;
  status: string;
  dueDate: string | null;
  paidAt: string | null;
  createdAt: string | null;
}

interface ApiStatus {
  id: number;
  service: string;
  status: string;
  responseTimeMs: number | null;
  errorCount: number;
  lastError: string | null;
  checkedAt: string | null;
}

interface SupportRequest {
  id: number;
  phone: string;
  description: string | null;
  status: string;
  reservationId: number | null;
  createdAt: string | null;
  resolvedAt: string | null;
}

interface SystemLog {
  id: number;
  level: string;
  source: string;
  message: string;
  details: string | null;
  phone: string | null;
  createdAt: string;
}

function InvoicesSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ['/api/invoices'],
  });

  const formatPrice = (amount: number | null) => {
    if (!amount) return "0.00";
    return (amount / 100).toFixed(2);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Odendi</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Beklemede</Badge>;
      case 'overdue':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Gecikti</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Fatura Yonetimi
        </CardTitle>
        <CardDescription>Tum acentalarin faturalari ve odeme durumlari</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Yukleniyor...</div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Henuz fatura bulunmuyor.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fatura No</TableHead>
                <TableHead>Abonelik ID</TableHead>
                <TableHead>Tutar</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Son Odeme</TableHead>
                <TableHead>Olusturulma</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id} data-testid={`row-invoice-${inv.id}`}>
                  <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                  <TableCell>#{inv.subscriptionId}</TableCell>
                  <TableCell>
                    {inv.currency === "TRY" 
                      ? `${formatPrice(inv.amountTl)} TL`
                      : `$${formatPrice(inv.amountUsd)}`}
                  </TableCell>
                  <TableCell>{getStatusBadge(inv.status)}</TableCell>
                  <TableCell>
                    {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("tr-TR") : "-"}
                  </TableCell>
                  <TableCell>
                    {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString("tr-TR") : "-"}
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

function ApiMonitoringSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: apiStatuses = [], isLoading, refetch } = useQuery<ApiStatus[]>({
    queryKey: ['/api/api-status'],
  });

  const checkMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/api-status/check'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/api-status'] });
      toast({ title: "Basarili", description: "API durumlari kontrol edildi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "API kontrolu yapilamadi.", variant: "destructive" });
    }
  });

  const getServiceIcon = (service: string) => {
    switch (service) {
      case 'twilio': return <MessageSquare className="h-5 w-5" />;
      case 'woocommerce': return <CreditCard className="h-5 w-5" />;
      case 'gemini': return <Zap className="h-5 w-5" />;
      case 'paytr': return <Receipt className="h-5 w-5" />;
      default: return <Radio className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'up': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'down': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'up': return <Wifi className="h-5 w-5 text-green-600" />;
      case 'degraded': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'down': return <WifiOff className="h-5 w-5 text-red-600" />;
      default: return <Radio className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const serviceNames: Record<string, string> = {
    twilio: 'Twilio (WhatsApp)',
    woocommerce: 'WooCommerce',
    gemini: 'Google Gemini AI',
    paytr: 'PayTR Odeme'
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5" />
            API Durum Izleme
          </div>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => checkMutation.mutate()}
            disabled={checkMutation.isPending}
            data-testid="button-check-api-status"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${checkMutation.isPending ? 'animate-spin' : ''}`} />
            Kontrol Et
          </Button>
        </CardTitle>
        <CardDescription>Entegre servislerin canli durum izlemesi</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Yukleniyor...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['twilio', 'woocommerce', 'gemini', 'paytr'].map((service) => {
              const status = apiStatuses.find(s => s.service === service);
              return (
                <div 
                  key={service} 
                  className="flex items-center justify-between p-4 border rounded-lg"
                  data-testid={`card-api-status-${service}`}
                >
                  <div className="flex items-center gap-3">
                    {getServiceIcon(service)}
                    <div>
                      <div className="font-medium">{serviceNames[service]}</div>
                      {status?.responseTimeMs && (
                        <div className="text-xs text-muted-foreground">
                          Yanit: {status.responseTimeMs}ms
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {status ? (
                      <>
                        {getStatusIcon(status.status)}
                        <span className={`text-sm font-medium ${getStatusColor(status.status)}`}>
                          {status.status === 'up' ? 'Calisiyor' : 
                           status.status === 'degraded' ? 'Yavas' : 'Kapalı'}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">Bilinmiyor</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {apiStatuses.length > 0 && apiStatuses[0]?.checkedAt && (
          <div className="mt-4 text-xs text-muted-foreground text-center">
            Son kontrol: {new Date(apiStatuses[0].checkedAt).toLocaleString("tr-TR")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface AppVersion {
  version: string;
  gitCommit: string | null;
  gitBranch: string | null;
  nodeVersion: string;
  environment: string;
  uptime: number;
  lastChecked: string;
}

interface StoredAppVersion {
  id: number;
  version: string;
  fileName: string;
  fileSize: number | null;
  checksum: string | null;
  status: string;
  notes: string | null;
  uploadedBy: string | null;
  backupFileName: string | null;
  isRollbackTarget: boolean | null;
  activatedAt: string | null;
  createdAt: string;
}

function ApplicationUpdatesSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [versionInput, setVersionInput] = useState("");
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false);
  const [selectedRollbackVersion, setSelectedRollbackVersion] = useState<StoredAppVersion | null>(null);
  
  const { data: versionInfo, isLoading, refetch } = useQuery<AppVersion>({
    queryKey: ['/api/system/version'],
    queryFn: async () => {
      const res = await fetch('/api/system/version');
      return res.json();
    },
  });

  const { data: storedVersions = [], isLoading: versionsLoading, refetch: refetchVersions } = useQuery<StoredAppVersion[]>({
    queryKey: ['/api/app-versions'],
    queryFn: async () => {
      const token = localStorage.getItem('superAdminToken');
      const res = await fetch('/api/app-versions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = localStorage.getItem('superAdminToken');
      const res = await fetch(`/api/app-versions/${id}/activate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Aktivasyon basarisiz');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/app-versions'] });
      toast({ title: "Basarili", description: "Surum aktif edildi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Surum aktif edilemedi.", variant: "destructive" });
    }
  });

  const rollbackMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = localStorage.getItem('superAdminToken');
      const res = await fetch(`/api/app-versions/${id}/rollback`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Geri alma basarisiz');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/app-versions'] });
      setRollbackDialogOpen(false);
      setSelectedRollbackVersion(null);
      toast({ title: "Basarili", description: "Onceki surume geri donuldu." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Geri alma basarisiz.", variant: "destructive" });
    }
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.tar.gz') && !file.name.endsWith('.zip')) {
        toast({ 
          title: "Gecersiz Dosya", 
          description: "Lutfen .tar.gz veya .zip dosyasi secin", 
          variant: "destructive" 
        });
        return;
      }
      setSelectedFile(file);
      // Extract version from filename if possible (e.g., smartur-1.2.3.tar.gz)
      const versionMatch = file.name.match(/(\d+\.\d+\.\d+)/);
      if (versionMatch) {
        setVersionInput(versionMatch[1]);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    if (!versionInput) {
      toast({ title: "Hata", description: "Surum numarasi giriniz", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const token = localStorage.getItem('superAdminToken');
      
      // First, create a version record
      const createRes = await fetch('/api/app-versions', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          version: versionInput,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          notes: 'Yuklenen guncelleme dosyasi'
        })
      });
      
      if (!createRes.ok) {
        const err = await createRes.json();
        throw new Error(err.error || 'Surum olusturulamadi');
      }

      const newVersion = await createRes.json();

      // Then upload the file
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('version', versionInput);
      formData.append('versionId', String(newVersion.id));

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/system/upload-update');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = async () => {
        if (xhr.status === 200) {
          // Auto-activate the new version after successful upload
          try {
            const activateRes = await fetch(`/api/app-versions/${newVersion.id}/activate`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (activateRes.ok) {
              toast({ title: "Basarili", description: "Guncelleme yuklendi ve aktif edildi. Onceki surum yedeklendi." });
            } else {
              toast({ title: "Uyari", description: "Guncelleme yuklendi ancak otomatik aktivasyon yapilamadi." });
            }
          } catch {
            toast({ title: "Uyari", description: "Guncelleme yuklendi ancak aktivasyon sirasinda hata olustu." });
          }
          setSelectedFile(null);
          setVersionInput("");
          refetch();
          refetchVersions();
        } else {
          let errorMsg = "Yukleme basarisiz";
          try {
            const resp = JSON.parse(xhr.responseText);
            errorMsg = resp.error || errorMsg;
          } catch {
            // Non-JSON response, use default error message
          }
          toast({ title: "Hata", description: errorMsg, variant: "destructive" });
        }
        setIsUploading(false);
        setUploadProgress(0);
      };

      xhr.onerror = () => {
        toast({ title: "Hata", description: "Yukleme basarisiz", variant: "destructive" });
        setIsUploading(false);
        setUploadProgress(0);
      };

      xhr.send(formData);
    } catch (err: any) {
      toast({ title: "Hata", description: err.message || "Yukleme basarisiz", variant: "destructive" });
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days} gun ${hours} saat`;
    if (hours > 0) return `${hours} saat ${mins} dakika`;
    return `${mins} dakika`;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Aktif</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Bekliyor</Badge>;
      case 'inactive':
        return <Badge variant="outline"><History className="h-3 w-3 mr-1" />Pasif</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Basarisiz</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleRollbackClick = (version: StoredAppVersion) => {
    setSelectedRollbackVersion(version);
    setRollbackDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Sistem Bilgileri
          </CardTitle>
          <CardDescription>Mevcut sistem surumu ve durum bilgileri</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Yukleniyor...</div>
          ) : versionInfo ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 border rounded-lg">
                <Package className="h-8 w-8 text-primary" />
                <div>
                  <div className="text-sm text-muted-foreground">Surum</div>
                  <div className="text-lg font-semibold">{versionInfo.version}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 border rounded-lg">
                <Clock className="h-8 w-8 text-blue-500" />
                <div>
                  <div className="text-sm text-muted-foreground">Calisma Suresi</div>
                  <div className="text-lg font-semibold">{formatUptime(versionInfo.uptime)}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 border rounded-lg">
                <GitBranch className="h-8 w-8 text-green-500" />
                <div>
                  <div className="text-sm text-muted-foreground">Git Commit</div>
                  <div className="text-lg font-semibold font-mono">{versionInfo.gitCommit?.slice(0, 8) || 'N/A'}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 border rounded-lg">
                <Server className="h-8 w-8 text-orange-500" />
                <div>
                  <div className="text-sm text-muted-foreground">Node.js</div>
                  <div className="text-lg font-semibold">{versionInfo.nodeVersion}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Sistem bilgisi alinamadi
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Uygulama Guncelleme
          </CardTitle>
          <CardDescription>
            Sistemi guncellemek icin yeni surum dosyasini yukleyin. Onceki surum otomatik olarak yedeklenir.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <input
              type="file"
              accept=".tar.gz,.zip"
              onChange={handleFileSelect}
              className="hidden"
              id="update-file-input"
              data-testid="input-update-file"
            />
            <label 
              htmlFor="update-file-input" 
              className="cursor-pointer"
            >
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-2">
                Dosya secmek icin tiklayin veya surukleyin
              </p>
              <p className="text-xs text-muted-foreground">
                Desteklenen formatlar: .tar.gz, .zip
              </p>
            </label>
          </div>

          {selectedFile && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-medium">{selectedFile.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="version-input">Surum Numarasi</Label>
                <Input
                  id="version-input"
                  placeholder="orn: 1.2.3"
                  value={versionInput}
                  onChange={(e) => setVersionInput(e.target.value)}
                  data-testid="input-version-number"
                />
              </div>
              
              <Button
                onClick={handleUpload}
                disabled={isUploading || !versionInput}
                className="w-full"
                data-testid="button-upload-update"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Yukleniyor... {uploadProgress}%
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Yukle ve Aktif Et
                  </>
                )}
              </Button>
            </div>
          )}

          {isUploading && (
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <h4 className="font-medium text-green-900 dark:text-green-200 mb-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Otomatik Yedekleme
            </h4>
            <p className="text-sm text-green-800 dark:text-green-300">
              Yeni surum yuklendiginde mevcut surum otomatik olarak yedeklenir. Herhangi bir sorun durumunda onceki surume geri donebilirsiniz.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Surum Gecmisi
          </CardTitle>
          <CardDescription>Yuklenen surumler ve geri alma secenekleri</CardDescription>
        </CardHeader>
        <CardContent>
          {versionsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Yukleniyor...</div>
          ) : storedVersions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Henuz surum gecmisi bulunmuyor. Ilk guncellemenizi yukleyerek baslayin.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Surum</TableHead>
                  <TableHead>Dosya</TableHead>
                  <TableHead>Boyut</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead className="text-right">Islemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {storedVersions.map((version) => (
                  <TableRow key={version.id} data-testid={`row-version-${version.id}`}>
                    <TableCell className="font-medium font-mono">{version.version}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{version.fileName}</TableCell>
                    <TableCell className="text-sm">{formatFileSize(version.fileSize)}</TableCell>
                    <TableCell>{getStatusBadge(version.status)}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(version.createdAt).toLocaleDateString("tr-TR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {version.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => activateMutation.mutate(version.id)}
                            disabled={activateMutation.isPending}
                            data-testid={`button-activate-${version.id}`}
                          >
                            <PlayCircle className="h-4 w-4 mr-1" />
                            Aktif Et
                          </Button>
                        )}
                        {version.isRollbackTarget && version.status !== 'active' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRollbackClick(version)}
                            data-testid={`button-rollback-${version.id}`}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Geri Al
                          </Button>
                        )}
                        {version.status === 'active' && (
                          <span className="text-xs text-muted-foreground">Aktif surum</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Yedek Indirme
          </CardTitle>
          <CardDescription>Mevcut sistemin yedegini indirin</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() => window.open('/smartur-backup.tar.gz', '_blank')}
            data-testid="button-download-backup"
          >
            <Download className="h-4 w-4 mr-2" />
            Yedegi Indir
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Mevcut sistemin tam yedegi (veritabani haric)
          </p>
        </CardContent>
      </Card>

      <Dialog open={rollbackDialogOpen} onOpenChange={setRollbackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Surumu Geri Al
            </DialogTitle>
            <DialogDescription>
              {selectedRollbackVersion && (
                <>
                  <strong>{selectedRollbackVersion.version}</strong> surumune geri donmek uzeresiniz.
                  Bu islem mevcut surumu pasif hale getirecek ve secilen surumu aktif edecektir.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 my-4">
            <h4 className="font-medium text-yellow-900 dark:text-yellow-200 mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Dikkat
            </h4>
            <ul className="text-sm text-yellow-800 dark:text-yellow-300 space-y-1">
              <li>Sistem geciici olarak durdurulabilir</li>
              <li>Mevcut surumdeki degisiklikler korunacak</li>
              <li>Geri alma islemi geri alinabilir</li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRollbackDialogOpen(false)}>
              Iptal
            </Button>
            <Button
              onClick={() => selectedRollbackVersion && rollbackMutation.mutate(selectedRollbackVersion.id)}
              disabled={rollbackMutation.isPending}
              data-testid="button-confirm-rollback"
            >
              {rollbackMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Isleniyor...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Geri Al
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AgencySupportSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  
  const { data: allRequests = [], isLoading } = useQuery<SupportRequest[]>({
    queryKey: ['/api/support-requests'],
  });

  // Filter only form-based requests (those starting with "[")
  const formRequests = allRequests.filter(r => r.phone.startsWith('['));
  const openRequests = formRequests.filter(r => r.status === 'open');
  const resolvedRequests = formRequests.filter(r => r.status === 'resolved');

  const resolveMutation = useMutation({
    mutationFn: (id: number) => apiRequest('POST', `/api/support-requests/${id}/resolve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/support-requests'] });
      toast({ title: "Basarili", description: "Talep cozuldu olarak isaretlendi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Talep guncellenemedi.", variant: "destructive" });
    }
  });

  // Parse the phone field to extract details
  const parseRequestInfo = (phone: string) => {
    const match = phone.match(/^\[([^\]]+)\]\s*(.+?)(?:\s*<([^>]+)>)?\s*-\s*(.+)$/);
    if (match) {
      return {
        type: match[1],
        name: match[2].trim(),
        email: match[3] || null,
        subject: match[4].trim()
      };
    }
    return { type: 'Diger', name: phone, email: null, subject: '' };
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'Hata Bildirimi':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Hata</Badge>;
      case 'Güncelleme İsteği':
        return <Badge variant="secondary"><RefreshCw className="h-3 w-3 mr-1" />Guncelleme</Badge>;
      case 'Öneri':
        return <Badge variant="outline"><Star className="h-3 w-3 mr-1" />Oneri</Badge>;
      case 'Soru':
        return <Badge variant="outline"><HelpCircle className="h-3 w-3 mr-1" />Soru</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Ajans Destek Talepleri
              {openRequests.length > 0 && (
                <Badge variant="destructive">{openRequests.length} Acik</Badge>
              )}
            </div>
          </CardTitle>
          <CardDescription>Acentalardan gelen destek talepleri (form uzerinden)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Yukleniyor...</div>
          ) : formRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Henuz ajans destek talebi bulunmuyor.</div>
          ) : (
            <div className="space-y-3">
              {openRequests.map((req) => {
                const info = parseRequestInfo(req.phone);
                const isExpanded = expandedId === req.id;
                return (
                  <div 
                    key={req.id} 
                    className="p-4 border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20 rounded-lg"
                    data-testid={`card-support-request-${req.id}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {getTypeBadge(info.type)}
                          <span className="font-medium">{info.name}</span>
                          {info.email && (
                            <span className="text-sm text-muted-foreground">({info.email})</span>
                          )}
                        </div>
                        <p className="font-medium mb-1">{info.subject}</p>
                        {req.description && (
                          <p className="text-sm text-muted-foreground">{req.description}</p>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {req.createdAt ? new Date(req.createdAt).toLocaleString("tr-TR") : "-"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => setExpandedId(isExpanded ? null : req.id)}
                          data-testid={`button-expand-${req.id}`}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Detay
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => resolveMutation.mutate(req.id)}
                          disabled={resolveMutation.isPending}
                          data-testid={`button-resolve-${req.id}`}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Cozuldu
                        </Button>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="text-sm space-y-2">
                          <div><strong>Talep Turu:</strong> {info.type}</div>
                          <div><strong>Gonderen:</strong> {info.name} {info.email ? `<${info.email}>` : ''}</div>
                          <div><strong>Konu:</strong> {info.subject}</div>
                          <div><strong>Tarih:</strong> {req.createdAt ? new Date(req.createdAt).toLocaleString("tr-TR") : "-"}</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              
              {resolvedRequests.length > 0 && (
                <>
                  <div className="text-sm font-medium text-muted-foreground mt-6 mb-2">
                    Cozulen Talepler ({resolvedRequests.length})
                  </div>
                  {resolvedRequests.slice(0, 5).map((req) => {
                    const info = parseRequestInfo(req.phone);
                    return (
                      <div 
                        key={req.id} 
                        className="p-3 border rounded-lg opacity-60"
                        data-testid={`card-support-request-resolved-${req.id}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Cozuldu
                          </Badge>
                          {getTypeBadge(info.type)}
                          <span className="text-sm">{info.name}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{info.subject}</p>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PlatformAdminsSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ email: '', name: '', role: 'admin' });

  const { data: admins = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/platform-admins'],
  });

  const createMutation = useMutation({
    mutationFn: (admin: any) => apiRequest('POST', '/api/platform-admins', admin),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/platform-admins'] });
      toast({ title: "Basarili", description: "Yonetici eklendi." });
      setShowAddDialog(false);
      setNewAdmin({ email: '', name: '', role: 'admin' });
    },
    onError: () => {
      toast({ title: "Hata", description: "Yonetici eklenemedi.", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/platform-admins/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/platform-admins'] });
      toast({ title: "Basarili", description: "Yonetici silindi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Yonetici silinemedi.", variant: "destructive" });
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Platform Yoneticileri
          </div>
          <Button size="sm" onClick={() => setShowAddDialog(true)} data-testid="button-add-admin">
            <Plus className="h-4 w-4 mr-1" />
            Yonetici Ekle
          </Button>
        </CardTitle>
        <CardDescription>Platform yoneticilerini yonetin</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Yukleniyor...</div>
        ) : admins.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Henuz yonetici bulunmuyor.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ad</TableHead>
                <TableHead>E-posta</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Olusturma</TableHead>
                <TableHead>Islemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((admin) => (
                <TableRow key={admin.id} data-testid={`row-admin-${admin.id}`}>
                  <TableCell className="font-medium">{admin.name || "-"}</TableCell>
                  <TableCell>{admin.email}</TableCell>
                  <TableCell>
                    <Badge variant={admin.role === 'super_admin' ? 'default' : 'secondary'}>
                      {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={admin.isActive ? 'default' : 'destructive'}>
                      {admin.isActive ? 'Aktif' : 'Pasif'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString("tr-TR") : "-"}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(admin.id)}
                      disabled={deleteMutation.isPending || admin.role === 'super_admin'}
                      data-testid={`button-delete-admin-${admin.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Yonetici Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Ad Soyad</Label>
              <Input
                value={newAdmin.name}
                onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                placeholder="John Doe"
                data-testid="input-admin-name"
              />
            </div>
            <div className="space-y-2">
              <Label>E-posta</Label>
              <Input
                type="email"
                value={newAdmin.email}
                onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                placeholder="admin@example.com"
                data-testid="input-admin-email"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Iptal</Button>
            <Button
              onClick={() => createMutation.mutate(newAdmin)}
              disabled={createMutation.isPending || !newAdmin.email}
              data-testid="button-save-admin"
            >
              {createMutation.isPending ? "Ekleniyor..." : "Ekle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function SecuritySection() {
  const { data: loginLogs = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/login-logs'],
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Giris Kayitlari
        </CardTitle>
        <CardDescription>Son giris islemleri ve guvenlik kayitlari</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Yukleniyor...</div>
        ) : loginLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Henuz giris kaydi bulunmuyor.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>Kullanici</TableHead>
                <TableHead>IP Adresi</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Tarayici</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loginLogs.slice(0, 50).map((log) => (
                <TableRow key={log.id} data-testid={`row-login-${log.id}`}>
                  <TableCell>
                    {log.createdAt ? new Date(log.createdAt).toLocaleString("tr-TR") : "-"}
                  </TableCell>
                  <TableCell className="font-medium">{log.email || log.userId || "-"}</TableCell>
                  <TableCell>{log.ipAddress || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={log.success ? 'default' : 'destructive'}>
                      {log.success ? 'Basarili' : 'Basarisiz'}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                    {log.userAgent || "-"}
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

function BulkOperationsSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedLicenses, setSelectedLicenses] = useState<number[]>([]);
  const [newPlanId, setNewPlanId] = useState<number | null>(null);
  const [extensionDays, setExtensionDays] = useState(30);

  const { data: licenses = [] } = useQuery<any[]>({
    queryKey: ['/api/licenses'],
  });

  const { data: plans = [] } = useQuery<SubscriptionPlan[]>({
    queryKey: ['/api/subscription-plans'],
  });

  const changePlanMutation = useMutation({
    mutationFn: (data: { licenseIds: number[], planId: number }) =>
      apiRequest('POST', '/api/bulk/plan-change', { licenseIds: data.licenseIds, newPlanId: data.planId }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/licenses'] });
      toast({ 
        title: "Basarili", 
        description: `${data.updated || 0} lisans guncellendi.` 
      });
      setSelectedLicenses([]);
    },
    onError: () => {
      toast({ title: "Hata", description: "Plan degistirilemedi.", variant: "destructive" });
    }
  });

  const extendMutation = useMutation({
    mutationFn: (data: { licenseIds: number[], days: number }) =>
      apiRequest('POST', '/api/bulk/extend-license', data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/licenses'] });
      toast({ 
        title: "Basarili", 
        description: `${data.updated || 0} lisans uzatildi.` 
      });
      setSelectedLicenses([]);
    },
    onError: () => {
      toast({ title: "Hata", description: "Lisans uzatilamadi.", variant: "destructive" });
    }
  });

  const toggleLicense = (id: number) => {
    setSelectedLicenses(prev =>
      prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedLicenses.length === licenses.length) {
      setSelectedLicenses([]);
    } else {
      setSelectedLicenses(licenses.map(l => l.id));
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Toplu Islemler
          </CardTitle>
          <CardDescription>Birden fazla lisans uzerinde toplu islem yapin</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={selectAll}
              data-testid="button-select-all"
            >
              {selectedLicenses.length === licenses.length ? 'Tumunu Kaldir' : 'Tumunu Sec'}
            </Button>
            <span className="text-sm text-muted-foreground">
              {selectedLicenses.length} lisans secildi
            </span>
          </div>

          <div className="border rounded-lg max-h-64 overflow-y-auto">
            {licenses.map((lic) => (
              <div
                key={lic.id}
                className={cn(
                  "flex items-center gap-3 p-3 border-b last:border-b-0 cursor-pointer hover-elevate",
                  selectedLicenses.includes(lic.id) && "bg-primary/10"
                )}
                onClick={() => toggleLicense(lic.id)}
                data-testid={`checkbox-license-${lic.id}`}
              >
                <input
                  type="checkbox"
                  checked={selectedLicenses.includes(lic.id)}
                  onChange={() => {}}
                  className="h-4 w-4"
                />
                <div className="flex-1">
                  <div className="font-medium">{lic.companyName}</div>
                  <div className="text-sm text-muted-foreground">{lic.email}</div>
                </div>
                <Badge variant={lic.isActive ? 'default' : 'destructive'}>
                  {lic.planType || 'trial'}
                </Badge>
              </div>
            ))}
          </div>

          {selectedLicenses.length > 0 && (
            <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Plan Degistir</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <select
                    className="w-full p-2 border rounded-md"
                    value={newPlanId || ''}
                    onChange={(e) => setNewPlanId(Number(e.target.value) || null)}
                    data-testid="select-bulk-plan"
                  >
                    <option value="">Plan Sec</option>
                    {plans.filter(p => p.isActive).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <Button
                    onClick={() => newPlanId && changePlanMutation.mutate({
                      licenseIds: selectedLicenses,
                      planId: newPlanId
                    })}
                    disabled={!newPlanId || changePlanMutation.isPending}
                    className="w-full"
                    data-testid="button-bulk-change-plan"
                  >
                    {changePlanMutation.isPending ? "Guncelleniyor..." : "Plani Degistir"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Lisans Uzat</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={extensionDays}
                      onChange={(e) => setExtensionDays(Number(e.target.value))}
                      min={1}
                      max={365}
                      className="w-24"
                      data-testid="input-extension-days"
                    />
                    <span className="text-sm text-muted-foreground">gun</span>
                  </div>
                  <Button
                    onClick={() => extendMutation.mutate({
                      licenseIds: selectedLicenses,
                      days: extensionDays
                    })}
                    disabled={extendMutation.isPending}
                    className="w-full"
                    data-testid="button-bulk-extend"
                  >
                    {extendMutation.isPending ? "Uzatiliyor..." : "Lisans Uzat"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SystemMonitoringSection() {
  const { data: dbStats, isLoading: dbLoading, refetch: refetchDb } = useQuery<any>({
    queryKey: ['/api/system/db-stats'],
    refetchInterval: 30000,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Server className="h-5 w-5" />
          Sistem Izleme
        </h3>
        <Button variant="outline" size="sm" onClick={() => refetchDb()} data-testid="button-refresh-system">
          <RefreshCw className="h-4 w-4 mr-1" />
          Yenile
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4" />
              Veritabani
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dbLoading ? (
              <div className="text-muted-foreground">Yukleniyor...</div>
            ) : dbStats ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Durum</span>
                  <Badge variant={dbStats.status === 'connected' ? 'default' : 'destructive'}>
                    {dbStats.status === 'connected' ? 'Bagli' : 'Bagli Degil'}
                  </Badge>
                </div>
                {dbStats.tables && Object.entries(dbStats.tables).map(([table, count]) => (
                  <div key={table} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground capitalize">{table}</span>
                    <span className="font-medium">{String(count)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground">Veri yok</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              Sunucu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Node.js</span>
                <span className="text-sm font-medium">{typeof process !== 'undefined' ? 'Aktif' : 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Ortam</span>
                <Badge variant="outline">Development</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              Depolama
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tip</span>
                <span className="text-sm font-medium">PostgreSQL</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Provider</span>
                <Badge variant="outline">Replit</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RevenueSection() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const { data: summary, isLoading: summaryLoading } = useQuery<any>({
    queryKey: ['/api/revenue/summary'],
  });

  const { data: monthlyData = [], isLoading: monthlyLoading } = useQuery<any[]>({
    queryKey: ['/api/revenue/monthly', selectedYear],
    queryFn: async () => {
      const res = await fetch(`/api/revenue/monthly?year=${selectedYear}`);
      if (!res.ok) throw new Error('Failed to fetch monthly revenue');
      return res.json();
    },
  });

  const { data: overdueInvoices = [] } = useQuery<any[]>({
    queryKey: ['/api/invoices/overdue'],
  });

  const formatCurrency = (amount: number, currency: string = 'TRY') => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Toplam Gelir (TL)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryLoading ? '...' : formatCurrency(summary?.totalRevenueTl || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Toplam Gelir (USD)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryLoading ? '...' : formatCurrency(summary?.totalRevenueUsd || 0, 'USD')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tamamlanan Odemeler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {summaryLoading ? '...' : summary?.completedPayments || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bekleyen Odemeler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {summaryLoading ? '...' : summary?.pendingPayments || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Aylik Gelir
            </div>
            <select
              className="p-2 border rounded-md text-sm"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              data-testid="select-revenue-year"
            >
              {[currentYear - 1, currentYear, currentYear + 1].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyLoading ? (
            <div className="text-center py-8 text-muted-foreground">Yukleniyor...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ay</TableHead>
                  <TableHead className="text-right">Gelir (TL)</TableHead>
                  <TableHead className="text-right">Gelir (USD)</TableHead>
                  <TableHead className="text-right">Islem Sayisi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyData.map((month: any) => (
                  <TableRow key={month.month}>
                    <TableCell className="font-medium">{month.monthName}</TableCell>
                    <TableCell className="text-right">{formatCurrency(month.tl)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(month.usd, 'USD')}</TableCell>
                    <TableCell className="text-right">{month.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {overdueInvoices.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              Vadesi Gecmis Faturalar ({overdueInvoices.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fatura No</TableHead>
                  <TableHead>Ajans</TableHead>
                  <TableHead>Tutar</TableHead>
                  <TableHead>Vade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdueInvoices.map((inv: any) => (
                  <TableRow key={inv.id} className="bg-orange-50 dark:bg-orange-950/20">
                    <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                    <TableCell>{inv.agencyName}</TableCell>
                    <TableCell>{formatCurrency(inv.totalTl)}</TableCell>
                    <TableCell className="text-orange-600">
                      {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("tr-TR") : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
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
        toast({ title: "Giris Basarili", description: "Super Admin paneline hos geldiniz." });
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

  const { data: plans = [], isLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscription-plans"],
  });

  const { data: subscriptionsData = [] } = useQuery<Subscription[]>({
    queryKey: ["/api/subscriptions"],
  });

  const { data: paymentsData = [] } = useQuery<SubscriptionPayment[]>({
    queryKey: ["/api/subscription-payments"],
  });

  // Plan features from database
  const { data: planFeatures = [] } = useQuery<PlanFeature[]>({
    queryKey: ["/api/plan-features"],
  });

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
          <TabsTrigger value="features" data-testid="tab-features">
            <Settings2 className="h-4 w-4 mr-2" />
            Ozellikler
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
          <TabsTrigger value="invoices" data-testid="tab-invoices">
            <Receipt className="h-4 w-4 mr-2" />
            Faturalar
          </TabsTrigger>
          <TabsTrigger value="api-status" data-testid="tab-api-status">
            <Radio className="h-4 w-4 mr-2" />
            API Izleme
          </TabsTrigger>
          <TabsTrigger value="support" data-testid="tab-support">
            <MessageSquare className="h-4 w-4 mr-2" />
            Destek
          </TabsTrigger>
          <TabsTrigger value="platform-admins" data-testid="tab-platform-admins">
            <UserCog className="h-4 w-4 mr-2" />
            Yoneticiler
          </TabsTrigger>
          <TabsTrigger value="security" data-testid="tab-security">
            <Shield className="h-4 w-4 mr-2" />
            Guvenlik
          </TabsTrigger>
          <TabsTrigger value="bulk-ops" data-testid="tab-bulk-ops">
            <Layers className="h-4 w-4 mr-2" />
            Toplu Islem
          </TabsTrigger>
          <TabsTrigger value="system" data-testid="tab-system">
            <Server className="h-4 w-4 mr-2" />
            Sistem
          </TabsTrigger>
          <TabsTrigger value="revenue" data-testid="tab-revenue">
            <TrendingUp className="h-4 w-4 mr-2" />
            Gelir
          </TabsTrigger>
          <TabsTrigger value="updates" data-testid="tab-updates">
            <RefreshCw className="h-4 w-4 mr-2" />
            Guncellemeler
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
                        const feature = planFeatures.find((o) => o.key === f) || FEATURE_OPTIONS.find((o) => o.key === f);
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

        <TabsContent value="features" className="space-y-4 mt-4">
          <PlanFeaturesSection />
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

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4 mt-4">
          <InvoicesSection />
        </TabsContent>

        {/* API Status Tab */}
        <TabsContent value="api-status" className="space-y-4 mt-4">
          <ApiMonitoringSection />
        </TabsContent>

        {/* Support Tab - Agency Form Requests Only */}
        <TabsContent value="support" className="space-y-4 mt-4">
          <AgencySupportSection />
        </TabsContent>

        {/* Platform Admins Tab */}
        <TabsContent value="platform-admins" className="space-y-4 mt-4">
          <PlatformAdminsSection />
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4 mt-4">
          <SecuritySection />
        </TabsContent>

        {/* Bulk Operations Tab */}
        <TabsContent value="bulk-ops" className="space-y-4 mt-4">
          <BulkOperationsSection />
        </TabsContent>

        {/* System Monitoring Tab */}
        <TabsContent value="system" className="space-y-4 mt-4">
          <SystemMonitoringSection />
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-4 mt-4">
          <RevenueSection />
        </TabsContent>

        {/* Updates Tab */}
        <TabsContent value="updates" className="space-y-4 mt-4">
          <ApplicationUpdatesSection />
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
              <div className="grid grid-cols-2 gap-2 p-3 border rounded-md max-h-64 overflow-y-auto">
                {(planFeatures.length > 0 ? planFeatures.filter(f => f.isActive) : FEATURE_OPTIONS).map((feature) => {
                  const isEnabled = JSON.parse(planForm.features || "[]").includes(feature.key);
                  const FeatureIcon = 'icon' in feature && typeof feature.icon === 'string' 
                    ? getIconComponent(feature.icon) 
                    : (feature as typeof FEATURE_OPTIONS[0]).icon || Star;
                  return (
                    <div
                      key={feature.key}
                      className="flex items-center justify-between p-2 rounded hover-elevate cursor-pointer"
                      onClick={() => toggleFeature(feature.key)}
                      data-testid={`toggle-feature-${feature.key}`}
                    >
                      <div className="flex items-center gap-2">
                        <FeatureIcon className="h-4 w-4 text-muted-foreground" />
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
