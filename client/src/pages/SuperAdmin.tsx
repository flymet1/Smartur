import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { ImageUpload } from "@/components/ImageUpload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Key,
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
  Building,
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
  HardDrive,
  UserPlus,
  KeyRound,
  Palette,
  Globe
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
  { key: "whatsapp_bot", label: "WhatsApp AI Bot", icon: MessageSquare },
  { key: "website_builder", label: "Web Sitesi Hizmeti", icon: Globe },
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

interface AppUser {
  id: number;
  username: string;
  email: string;
  name: string | null;
  phone: string | null;
  companyName: string | null;
  membershipType: string | null;
  membershipEndDate: string | null;
  planId: number | null;
  tenantId: number | null;
  isSuspended: boolean;
  isActive: boolean;
  notes: string | null;
  createdAt: string | null;
  roles?: Role[];
}

interface Role {
  id: number;
  name: string;
  displayName: string;
  description: string | null;
  color: string | null;
  isActive: boolean;
  createdAt: string | null;
}

interface Permission {
  id: number;
  key: string;
  displayName: string;
  description: string | null;
  category: string;
  isActive: boolean;
}

interface UserLoginLog {
  id: number;
  userId: number;
  loginAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  success: boolean;
}

interface Tenant {
  id: number;
  name: string;
  slug: string;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  timezone: string | null;
  language: string | null;
  isActive: boolean;
  createdAt: string | null;
  planCode: string | null;
}

function TenantManagementSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [isNewTenant, setIsNewTenant] = useState(false);
  const [tenantForm, setTenantForm] = useState({
    name: "",
    slug: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
    logoUrl: "",
    primaryColor: "262 83% 58%",
    accentColor: "142 76% 36%",
    timezone: "Europe/Istanbul",
    language: "tr",
    isActive: true,
    // Admin user fields (only for new tenant)
    adminUsername: "",
    adminEmail: "",
    adminPassword: "",
    adminName: "",
    // License duration in days (0 = unlimited)
    licenseDuration: "30",
    // Subscription plan
    planCode: "trial",
  });

  // Query subscription plans for dropdown
  const { data: subscriptionPlans = [] } = useQuery<{id: number; code: string; name: string}[]>({
    queryKey: ['/api/subscription-plans'],
  });

  const { data: tenants = [], isLoading } = useQuery<Tenant[]>({
    queryKey: ['/api/tenants'],
  });

  // Query app users to get membership info per tenant
  const { data: appUsers = [] } = useQuery<AppUser[]>({
    queryKey: ['/api/app-users'],
  });

  // Helper function to get tenant admin user info
  const getTenantAdminInfo = (tenantId: number) => {
    const tenantUsers = appUsers.filter(u => u.tenantId === tenantId);
    if (tenantUsers.length === 0) return null;
    // Return the first user (usually the admin)
    return tenantUsers[0];
  };

  // Helper function to get remaining days
  const getRemainingDays = (endDate: string | null) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Helper function to get plan display name
  const getPlanDisplayName = (planCode: string | null) => {
    const planNames: Record<string, string> = {
      'trial': 'Deneme',
      'basic': 'Temel',
      'starter': 'Starter',
      'professional': 'Profesyonel',
      'enterprise': 'Kurumsal'
    };
    return planCode ? planNames[planCode] || planCode : 'Belirsiz';
  };

  // Helper function to get plan badge color
  const getPlanBadgeVariant = (planCode: string | null): "default" | "secondary" | "outline" | "destructive" => {
    switch (planCode) {
      case 'enterprise': return 'default';
      case 'professional': return 'default';
      case 'basic': return 'secondary';
      case 'starter': return 'secondary';
      case 'trial': return 'outline';
      default: return 'secondary';
    }
  };

  const createTenantMutation = useMutation({
    mutationFn: (data: typeof tenantForm) => apiRequest('POST', '/api/tenants', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenants'] });
      setEditingTenant(null);
      setIsNewTenant(false);
      toast({ title: "Başarılı", description: "Acenta oluşturuldu" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Acenta oluşturulamadi", variant: "destructive" });
    }
  });

  const updateTenantMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<typeof tenantForm> }) => 
      apiRequest('PATCH', `/api/tenants/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenants'] });
      queryClient.invalidateQueries({ queryKey: ['/api/app-users'] });
      setEditingTenant(null);
      toast({ title: "Başarılı", description: "Acenta güncellendi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Acenta güncellenemedi", variant: "destructive" });
    }
  });

  const deleteTenantMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/tenants/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenants'] });
      toast({ title: "Başarılı", description: "Acenta silindi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Acenta silinemedi", variant: "destructive" });
    }
  });

  // Password reset state
  const [resetPasswordForm, setResetPasswordForm] = useState({ newPassword: "", confirmPassword: "" });
  
  const resetPasswordMutation = useMutation({
    mutationFn: ({ tenantId, newPassword }: { tenantId: number; newPassword: string }) => 
      apiRequest('POST', `/api/tenants/${tenantId}/reset-admin-password`, { newPassword }),
    onSuccess: () => {
      setResetPasswordForm({ newPassword: "", confirmPassword: "" });
      toast({ title: "Başarılı", description: "Yönetici şifresi değiştirildi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Şifre değiştirilemedi", variant: "destructive" });
    }
  });

  const resetForm = () => {
    setTenantForm({
      name: "",
      slug: "",
      contactEmail: "",
      contactPhone: "",
      address: "",
      logoUrl: "",
      primaryColor: "262 83% 58%",
      accentColor: "142 76% 36%",
      timezone: "Europe/Istanbul",
      language: "tr",
      isActive: true,
      adminUsername: "",
      adminEmail: "",
      adminPassword: "",
      adminName: "",
      licenseDuration: "30",
      planCode: "trial",
    });
  };

  const openNewTenantDialog = () => {
    resetForm();
    setIsNewTenant(true);
    setEditingTenant({ id: 0 } as Tenant);
  };

  const openEditTenantDialog = (tenant: Tenant) => {
    setTenantForm({
      name: tenant.name || "",
      slug: tenant.slug || "",
      contactEmail: tenant.contactEmail || "",
      contactPhone: tenant.contactPhone || "",
      address: tenant.address || "",
      logoUrl: tenant.logoUrl || "",
      primaryColor: tenant.primaryColor || "262 83% 58%",
      accentColor: tenant.accentColor || "142 76% 36%",
      timezone: tenant.timezone || "Europe/Istanbul",
      language: tenant.language || "tr",
      isActive: tenant.isActive,
      adminUsername: "",
      adminEmail: "",
      adminPassword: "",
      adminName: "",
      licenseDuration: "0",
      planCode: tenant.planCode || "trial",
    });
    setIsNewTenant(false);
    setEditingTenant(tenant);
  };

  const handleSaveTenant = () => {
    if (isNewTenant) {
      createTenantMutation.mutate(tenantForm);
    } else if (editingTenant?.id) {
      updateTenantMutation.mutate({ id: editingTenant.id, data: tenantForm });
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">Acentalar (Tenants)</h2>
          <p className="text-sm text-muted-foreground">Platformu kullanan acentalari yonetin</p>
        </div>
        <Button onClick={openNewTenantDialog} data-testid="button-new-tenant">
          <Plus className="h-4 w-4 mr-2" />
          Yeni Acenta
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
      ) : tenants.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Henuz acenta bulunmuyor.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Acenta</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>İletişim</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Üyelik Süresi</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Kayıt Tarihi</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((tenant) => (
                <TableRow key={tenant.id} data-testid={`row-tenant-${tenant.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {tenant.logoUrl ? (
                        <img src={tenant.logoUrl} alt={tenant.name} className="h-8 w-8 rounded object-contain" />
                      ) : (
                        <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{tenant.name}</div>
                        {tenant.slug === "default" && (
                          <Badge variant="outline" className="text-xs">Varsayılan</Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{tenant.slug}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {tenant.contactEmail && <div>{tenant.contactEmail}</div>}
                      {tenant.contactPhone && <div className="text-muted-foreground">{tenant.contactPhone}</div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getPlanBadgeVariant(tenant.planCode)}>
                      {getPlanDisplayName(tenant.planCode)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const adminInfo = getTenantAdminInfo(tenant.id);
                      if (!adminInfo?.membershipEndDate) {
                        return <span className="text-muted-foreground">Sınırsız</span>;
                      }
                      const remainingDays = getRemainingDays(adminInfo.membershipEndDate);
                      if (remainingDays === null) return <span className="text-muted-foreground">-</span>;
                      if (remainingDays < 0) {
                        return <Badge variant="destructive">{Math.abs(remainingDays)} gün geçti</Badge>;
                      }
                      if (remainingDays <= 7) {
                        return <Badge variant="destructive">{remainingDays} gün kaldı</Badge>;
                      }
                      if (remainingDays <= 30) {
                        return <Badge variant="secondary" className="bg-yellow-500 text-white">{remainingDays} gün kaldı</Badge>;
                      }
                      return <span className="text-muted-foreground">{remainingDays} gün kaldı</span>;
                    })()}
                  </TableCell>
                  <TableCell>
                    {tenant.isActive ? (
                      <Badge variant="default" className="bg-green-600">Aktif</Badge>
                    ) : (
                      <Badge variant="secondary">Pasif</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString("tr-TR") : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEditTenantDialog(tenant)}
                        data-testid={`button-edit-tenant-${tenant.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {tenant.slug !== "default" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            if (confirm(`"${tenant.name}" acentasini silmek istediğinizden emin misiniz?`)) {
                              deleteTenantMutation.mutate(tenant.id);
                            }
                          }}
                          data-testid={`button-delete-tenant-${tenant.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={!!editingTenant} onOpenChange={(open) => !open && setEditingTenant(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isNewTenant ? "Yeni Acenta Oluştur" : "Acenta Düzenle"}</DialogTitle>
            <DialogDescription>
              {isNewTenant 
                ? "Platformu kullanacak yeni bir acenta ekleyin"
                : "Acenta bilgilerini güncelleyin"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Acenta Adı *</Label>
                <Input
                  id="name"
                  value={tenantForm.name}
                  onChange={(e) => {
                    setTenantForm({ 
                      ...tenantForm, 
                      name: e.target.value,
                      slug: isNewTenant ? generateSlug(e.target.value) : tenantForm.slug
                    });
                  }}
                  placeholder="Ornek: Kapadokya Tours"
                  data-testid="input-tenant-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug (URL) *</Label>
                <Input
                  id="slug"
                  value={tenantForm.slug}
                  onChange={(e) => setTenantForm({ ...tenantForm, slug: generateSlug(e.target.value) })}
                  placeholder="ornek: kapadokya-tours"
                  data-testid="input-tenant-slug"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactEmail">E-posta</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={tenantForm.contactEmail}
                  onChange={(e) => setTenantForm({ ...tenantForm, contactEmail: e.target.value })}
                  placeholder="info@acenta.com"
                  data-testid="input-tenant-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Telefon</Label>
                <Input
                  id="contactPhone"
                  value={tenantForm.contactPhone}
                  onChange={(e) => setTenantForm({ ...tenantForm, contactPhone: e.target.value })}
                  placeholder="+90 555 123 4567"
                  data-testid="input-tenant-phone"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Adres</Label>
              <Textarea
                id="address"
                value={tenantForm.address}
                onChange={(e) => setTenantForm({ ...tenantForm, address: e.target.value })}
                placeholder="Acenta adresi"
                rows={2}
                data-testid="input-tenant-address"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={tenantForm.isActive}
                onCheckedChange={(checked) => setTenantForm({ ...tenantForm, isActive: checked })}
                data-testid="switch-tenant-active"
              />
              <Label htmlFor="isActive">Aktif</Label>
            </div>

            {/* Plan & Membership Section - Only for existing tenant */}
            {!isNewTenant && editingTenant && editingTenant.id > 0 && (
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <div>
                    <h4 className="font-medium">Abonelik Yönetimi</h4>
                    <p className="text-sm text-muted-foreground">Plan ve üyelik süresini güncelleyin</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editPlanCode">Abonelik Paketi</Label>
                    <Select
                      value={tenantForm.planCode}
                      onValueChange={(value) => setTenantForm({ ...tenantForm, planCode: value })}
                    >
                      <SelectTrigger id="editPlanCode" data-testid="select-edit-plan-code">
                        <SelectValue placeholder="Paket seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="trial">Deneme</SelectItem>
                        <SelectItem value="basic">Temel</SelectItem>
                        <SelectItem value="starter">Starter</SelectItem>
                        <SelectItem value="professional">Profesyonel</SelectItem>
                        <SelectItem value="enterprise">Kurumsal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Mevcut Üyelik Durumu</Label>
                    <div className="text-sm p-2 bg-muted rounded">
                      {(() => {
                        const adminInfo = getTenantAdminInfo(editingTenant.id);
                        if (!adminInfo?.membershipEndDate) {
                          return <span className="text-muted-foreground">Sınırsız</span>;
                        }
                        const remainingDays = getRemainingDays(adminInfo.membershipEndDate);
                        const endDateStr = new Date(adminInfo.membershipEndDate).toLocaleDateString("tr-TR");
                        if (remainingDays === null) return <span>-</span>;
                        if (remainingDays < 0) {
                          return <span className="text-destructive">{Math.abs(remainingDays)} gün önce sona erdi ({endDateStr})</span>;
                        }
                        return <span>{remainingDays} gün kaldı ({endDateStr})</span>;
                      })()}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="extensionDays">Süre Ekle</Label>
                    <Select
                      value={tenantForm.licenseDuration}
                      onValueChange={(value) => setTenantForm({ ...tenantForm, licenseDuration: value })}
                    >
                      <SelectTrigger id="extensionDays" data-testid="select-extension-days">
                        <SelectValue placeholder="Eklenecek süre" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Süre ekleme</SelectItem>
                        <SelectItem value="7">+7 Gün</SelectItem>
                        <SelectItem value="14">+14 Gün</SelectItem>
                        <SelectItem value="30">+30 Gün (1 Ay)</SelectItem>
                        <SelectItem value="90">+90 Gün (3 Ay)</SelectItem>
                        <SelectItem value="180">+180 Gün (6 Ay)</SelectItem>
                        <SelectItem value="365">+365 Gün (1 Yıl)</SelectItem>
                        <SelectItem value="-1">Sınırsız Yap</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Mevcut sürenin üzerine eklenir
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Yeni Bitiş Tarihi</Label>
                    <div className="text-sm p-2 bg-muted rounded">
                      {(() => {
                        const adminInfo = getTenantAdminInfo(editingTenant.id);
                        const extensionDays = parseInt(tenantForm.licenseDuration) || 0;
                        
                        if (extensionDays === -1) {
                          return <span className="text-green-600 font-medium">Sınırsız</span>;
                        }
                        if (extensionDays === 0) {
                          return <span className="text-muted-foreground">Değişiklik yok</span>;
                        }
                        
                        let baseDate = new Date();
                        if (adminInfo?.membershipEndDate) {
                          const endDate = new Date(adminInfo.membershipEndDate);
                          if (endDate > baseDate) {
                            baseDate = endDate;
                          }
                        }
                        baseDate.setDate(baseDate.getDate() + extensionDays);
                        return <span className="text-green-600 font-medium">{baseDate.toLocaleDateString("tr-TR")}</span>;
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Password Reset Section - Only for existing tenant */}
            {!isNewTenant && editingTenant && editingTenant.id > 0 && (
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center gap-2 mb-4">
                  <Key className="h-5 w-5 text-orange-500" />
                  <div>
                    <h4 className="font-medium">Şifre Sıfırlama</h4>
                    <p className="text-sm text-muted-foreground">Acenta yöneticisinin şifresini değiştir</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Yeni Şifre</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={resetPasswordForm.newPassword}
                      onChange={(e) => setResetPasswordForm({ ...resetPasswordForm, newPassword: e.target.value })}
                      placeholder="Yeni şifre girin"
                      data-testid="input-new-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Şifre Tekrar</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={resetPasswordForm.confirmPassword}
                      onChange={(e) => setResetPasswordForm({ ...resetPasswordForm, confirmPassword: e.target.value })}
                      placeholder="Şifreyi tekrar girin"
                      data-testid="input-confirm-password"
                    />
                  </div>
                </div>

                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={() => {
                    if (resetPasswordForm.newPassword !== resetPasswordForm.confirmPassword) {
                      toast({ title: "Hata", description: "Şifreler eşleşmiyor", variant: "destructive" });
                      return;
                    }
                    if (resetPasswordForm.newPassword.length < 6) {
                      toast({ title: "Hata", description: "Şifre en az 6 karakter olmalı", variant: "destructive" });
                      return;
                    }
                    resetPasswordMutation.mutate({ 
                      tenantId: editingTenant.id, 
                      newPassword: resetPasswordForm.newPassword 
                    });
                  }}
                  disabled={!resetPasswordForm.newPassword || !resetPasswordForm.confirmPassword || resetPasswordMutation.isPending}
                  data-testid="button-reset-password"
                >
                  {resetPasswordMutation.isPending ? "Değiştiriliyor..." : "Şifreyi Değiştir"}
                </Button>
              </div>
            )}

            {/* Admin User Section - Only for new tenant */}
            {isNewTenant && (
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <h4 className="font-medium">Yönetiçi Hesabı</h4>
                    <p className="text-sm text-muted-foreground">Acenta için yönetiçi kullanıcısi oluştur</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="adminUsername">Kullanıcı Adı *</Label>
                    <Input
                      id="adminUsername"
                      value={tenantForm.adminUsername}
                      onChange={(e) => setTenantForm({ ...tenantForm, adminUsername: e.target.value })}
                      placeholder="ornek: kapadokya_admin"
                      data-testid="input-admin-username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminEmail">E-posta *</Label>
                    <Input
                      id="adminEmail"
                      type="email"
                      value={tenantForm.adminEmail}
                      onChange={(e) => setTenantForm({ ...tenantForm, adminEmail: e.target.value })}
                      placeholder="admin@acenta.com"
                      data-testid="input-admin-email"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="adminName">Ad Soyad</Label>
                    <Input
                      id="adminName"
                      value={tenantForm.adminName}
                      onChange={(e) => setTenantForm({ ...tenantForm, adminName: e.target.value })}
                      placeholder="Yönetiçi Ad Soyad"
                      data-testid="input-admin-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminPassword">Şifre *</Label>
                    <Input
                      id="adminPassword"
                      type="password"
                      value={tenantForm.adminPassword}
                      onChange={(e) => setTenantForm({ ...tenantForm, adminPassword: e.target.value })}
                      placeholder="Guclu bir şifre girin"
                      data-testid="input-admin-password"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="planCode">Abonelik Paketi *</Label>
                    <Select
                      value={tenantForm.planCode}
                      onValueChange={(value) => setTenantForm({ ...tenantForm, planCode: value })}
                    >
                      <SelectTrigger id="planCode" data-testid="select-plan-code">
                        <SelectValue placeholder="Paket seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {subscriptionPlans.map((plan) => (
                          <SelectItem key={plan.code} value={plan.code}>
                            {plan.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Acentanin kullanacagi abonelik paketi
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="licenseDuration">Kullanim Süresi</Label>
                    <Select
                      value={tenantForm.licenseDuration}
                      onValueChange={(value) => setTenantForm({ ...tenantForm, licenseDuration: value })}
                    >
                      <SelectTrigger id="licenseDuration" data-testid="select-license-duration">
                        <SelectValue placeholder="Sure seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 Gun (Deneme)</SelectItem>
                        <SelectItem value="14">14 Gun</SelectItem>
                        <SelectItem value="30">30 Gun (1 Ay)</SelectItem>
                        <SelectItem value="90">90 Gun (3 Ay)</SelectItem>
                        <SelectItem value="180">180 Gun (6 Ay)</SelectItem>
                        <SelectItem value="365">365 Gun (1 Yıl)</SelectItem>
                        <SelectItem value="0">Sınırsız</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Acenta bu sure boyunca sistemi kullanabilir
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTenant(null)}>
              İptal
            </Button>
            <Button 
              onClick={handleSaveTenant}
              disabled={
                !tenantForm.name || !tenantForm.slug || 
                createTenantMutation.isPending || updateTenantMutation.isPending ||
                (isNewTenant && (!tenantForm.adminUsername || !tenantForm.adminEmail || !tenantForm.adminPassword))
              }
              data-testid="button-save-tenant"
            >
              {(createTenantMutation.isPending || updateTenantMutation.isPending) ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TenantStatsSection() {
  const { data: tenants = [] } = useQuery<Tenant[]>({
    queryKey: ['/api/tenants'],
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Acenta Istatistikleri</h2>
        <p className="text-sm text-muted-foreground">Tum acentalarin özet istatistikleri</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Toplam Acenta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenants.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Aktif Acenta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {tenants.filter(t => t.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pasif Acenta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {tenants.filter(t => !t.isActive).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Acenta Listesi</CardTitle>
        </CardHeader>
        <CardContent>
          {tenants.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Henuz acenta bulunmuyor</p>
          ) : (
            <div className="space-y-2">
              {tenants.map((tenant) => (
                <div key={tenant.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{tenant.name}</div>
                      <div className="text-sm text-muted-foreground">{tenant.contactEmail || tenant.slug}</div>
                    </div>
                  </div>
                  <Badge variant={tenant.isActive ? "default" : "secondary"}>
                    {tenant.isActive ? "Aktif" : "Pasif"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function UserManagementSection() {
  const [showLoginHistory, setShowLoginHistory] = useState<number | null>(null);

  const { data: users = [], isLoading } = useQuery<AppUser[]>({
    queryKey: ['/api/app-users'],
  });

  const { data: tenants = [] } = useQuery<Tenant[]>({
    queryKey: ['/api/tenants'],
  });

  const { data: loginLogs = [] } = useQuery<UserLoginLog[]>({
    queryKey: ['/api/user-login-logs', showLoginHistory],
    enabled: showLoginHistory !== null,
  });

  const getMembershipLabel = (type: string | null) => {
    switch (type) {
      case "trial": return "Deneme";
      case "monthly": return "Aylık";
      case "yearly": return "Yıllik";
      default: return type || "-";
    }
  };

  const getTenantName = (tenantId: number | null) => {
    if (!tenantId) return "-";
    const tenant = tenants.find(t => t.id === tenantId);
    return tenant?.name || "-";
  };

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100">Kullanıcı Yönetimi Değişti</h4>
              <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                Her acenta artik kendi kullanıcılarıni <strong>Ayarlar &gt; Kullanıcılar</strong> sayfasından yonetiyor.
                Bu sayfa sadece izleme amaciyla kullanilmaktadir.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Tum Kullanıcılar (İzleme)
            </CardTitle>
            <CardDescription>Platformdaki tum kullanıcılari görüntüleyin</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Henuz kullanıcı bulunmuyor.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Kullanıcı</TableHead>
                  <TableHead>Acenta</TableHead>
                  <TableHead>Üyelik</TableHead>
                  <TableHead>Roller</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Giriş Geçmişi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                    <TableCell>{user.id}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.name || user.username}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getTenantName(user.tenantId)}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="w-fit">
                          {getMembershipLabel(user.membershipType)}
                        </Badge>
                        {user.membershipEndDate && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(user.membershipEndDate).toLocaleDateString("tr-TR")}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles && user.roles.length > 0 ? (
                          user.roles.map(role => (
                            <Badge 
                              key={role.id} 
                              variant="secondary"
                              style={{ backgroundColor: role.color || undefined }}
                            >
                              {role.displayName}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isSuspended ? "destructive" : user.isActive ? "default" : "secondary"}>
                        {user.isSuspended ? "Askida" : user.isActive ? "Aktif" : "Pasif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button 
                        size="icon" 
                        variant="ghost"
                        onClick={() => setShowLoginHistory(user.id)}
                        data-testid={`button-login-history-${user.id}`}
                      >
                        <History className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showLoginHistory !== null} onOpenChange={(open) => !open && setShowLoginHistory(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Giriş Geçmişi
            </DialogTitle>
            <DialogDescription>
              Kullanıcınin son giriş kayıtları
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-96">
            {loginLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Giriş kaydi bulunamadı.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead>IP Adresi</TableHead>
                    <TableHead>Durum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loginLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {new Date(log.loginAt).toLocaleString("tr-TR")}
                      </TableCell>
                      <TableCell>{log.ipAddress || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={log.success ? "default" : "destructive"}>
                          {log.success ? "Başarılı" : "Başarısız"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RolesPermissionsSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isNewRole, setIsNewRole] = useState(false);
  const [selectedRoleForPermissions, setSelectedRoleForPermissions] = useState<number | null>(null);
  const [roleForm, setRoleForm] = useState({
    name: "",
    displayName: "",
    description: "",
    color: "#6366f1"
  });

  const { data: roles = [], isLoading } = useQuery<Role[]>({
    queryKey: ['/api/roles'],
  });

  const { data: permissions = [] } = useQuery<Permission[]>({
    queryKey: ['/api/permissions'],
  });

  const { data: rolePermissions = [] } = useQuery<Permission[]>({
    queryKey: ['/api/roles', selectedRoleForPermissions, 'permissions'],
    enabled: selectedRoleForPermissions !== null,
  });

  const createRoleMutation = useMutation({
    mutationFn: (data: typeof roleForm) => apiRequest('POST', '/api/roles', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/roles'] });
      setEditingRole(null);
      setIsNewRole(false);
      resetRoleForm();
      toast({ title: "Başarılı", description: "Rol oluşturuldu." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Rol oluşturulamadi.", variant: "destructive" });
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<typeof roleForm> }) => 
      apiRequest('PATCH', `/api/roles/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/roles'] });
      setEditingRole(null);
      resetRoleForm();
      toast({ title: "Başarılı", description: "Rol güncellendi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Rol güncellenemedi.", variant: "destructive" });
    }
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/roles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/roles'] });
      toast({ title: "Başarılı", description: "Rol silindi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Rol silinemedi.", variant: "destructive" });
    }
  });

  const updateRolePermissionsMutation = useMutation({
    mutationFn: ({ roleId, permissionIds }: { roleId: number; permissionIds: number[] }) => 
      apiRequest('PUT', `/api/roles/${roleId}/permissions`, { permissionIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/roles', selectedRoleForPermissions, 'permissions'] });
      toast({ title: "Başarılı", description: "Izinler güncellendi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Izinler güncellenemedi.", variant: "destructive" });
    }
  });

  const initializePermissionsMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/permissions/initialize'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/permissions'] });
      toast({ title: "Başarılı", description: "Varsayılan izinler oluşturuldu." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Izinler oluşturulamadi.", variant: "destructive" });
    }
  });

  const resetRoleForm = () => {
    setRoleForm({
      name: "",
      displayName: "",
      description: "",
      color: "#6366f1"
    });
  };

  const openNewRoleDialog = () => {
    resetRoleForm();
    setIsNewRole(true);
    setEditingRole({ id: 0 } as Role);
  };

  const openEditRoleDialog = (role: Role) => {
    setRoleForm({
      name: role.name,
      displayName: role.displayName,
      description: role.description || "",
      color: role.color || "#6366f1"
    });
    setIsNewRole(false);
    setEditingRole(role);
  };

  const handleSaveRole = () => {
    if (isNewRole) {
      createRoleMutation.mutate(roleForm);
    } else if (editingRole) {
      updateRoleMutation.mutate({ id: editingRole.id, data: roleForm });
    }
  };

  const handleTogglePermission = (permissionId: number) => {
    if (selectedRoleForPermissions === null) return;
    
    const currentPermissionIds = rolePermissions.map(p => p.id);
    const newPermissionIds = currentPermissionIds.includes(permissionId)
      ? currentPermissionIds.filter(id => id !== permissionId)
      : [...currentPermissionIds, permissionId];
    
    updateRolePermissionsMutation.mutate({
      roleId: selectedRoleForPermissions,
      permissionIds: newPermissionIds
    });
  };

  const groupedPermissions = permissions.reduce((acc, perm) => {
    const category = perm.category || "general";
    if (!acc[category]) acc[category] = [];
    acc[category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  const categoryLabels: Record<string, string> = {
    reservations: "Rezervasyonlar",
    activities: "Aktiviteler",
    customers: "Müşteriler",
    finance: "Finans",
    reports: "Raporlar",
    settings: "Ayarlar",
    users: "Kullanıcılar",
    general: "Genel"
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Roller
              </CardTitle>
              <CardDescription>Kullanıcı rollerini yonetin</CardDescription>
            </div>
            <Button onClick={openNewRoleDialog} data-testid="button-new-role">
              <Plus className="h-4 w-4 mr-2" />
              Yeni Rol
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
            ) : roles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Henuz rol bulunmuyor.</div>
            ) : (
              <div className="space-y-2">
                {roles.map((role) => (
                  <div 
                    key={role.id}
                    className={`flex items-center justify-between gap-4 p-3 border rounded-lg cursor-pointer ${
                      selectedRoleForPermissions === role.id ? "border-primary bg-primary/5" : ""
                    }`}
                    onClick={() => setSelectedRoleForPermissions(role.id)}
                    data-testid={`card-role-${role.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: role.color || "#6366f1" }}
                      />
                      <div>
                        <div className="font-medium">{role.displayName}</div>
                        <div className="text-sm text-muted-foreground">{role.name}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        size="icon" 
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); openEditRoleDialog(role); }}
                        data-testid={`button-edit-role-${role.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); deleteRoleMutation.mutate(role.id); }}
                        data-testid={`button-delete-role-${role.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Izinler
              </CardTitle>
              <CardDescription>
                {selectedRoleForPermissions 
                  ? `"${roles.find(r => r.id === selectedRoleForPermissions)?.displayName}" rolunun izinleri`
                  : "Bir rol seçin"
                }
              </CardDescription>
            </div>
            {permissions.length === 0 && (
              <Button 
                variant="outline" 
                onClick={() => initializePermissionsMutation.mutate()}
                disabled={initializePermissionsMutation.isPending}
                data-testid="button-init-permissions"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Izinleri Oluştur
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {selectedRoleForPermissions === null ? (
              <div className="text-center py-8 text-muted-foreground">
                Izinleri görüntülemek için sol taraftan bir rol seçin.
              </div>
            ) : permissions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Henuz izin tanımlanmamis. Varsayılan izinleri oluşturmak için butona tıklayın.
              </div>
            ) : (
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {Object.entries(groupedPermissions).map(([category, perms]) => (
                    <div key={category}>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Layers className="h-4 w-4" />
                        {categoryLabels[category] || category}
                      </h4>
                      <div className="space-y-1 ml-6">
                        {perms.map((perm) => {
                          const isChecked = rolePermissions.some(rp => rp.id === perm.id);
                          return (
                            <label 
                              key={perm.id}
                              className="flex items-center gap-2 p-2 rounded hover-elevate cursor-pointer"
                              data-testid={`checkbox-permission-${perm.id}`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleTogglePermission(perm.id)}
                                className="rounded border-gray-300"
                              />
                              <div className="flex-1">
                                <div className="text-sm">{perm.displayName}</div>
                                {perm.description && (
                                  <div className="text-xs text-muted-foreground">{perm.description}</div>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!editingRole} onOpenChange={(open) => !open && setEditingRole(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isNewRole ? "Yeni Rol Oluştur" : "Rolu Düzenle"}</DialogTitle>
            <DialogDescription>
              Rol bilgilerini girin veya güncelleyin.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rol Adı (key)</Label>
                <Input
                  value={roleForm.name}
                  onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                  placeholder="admin"
                  data-testid="input-role-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Gorunen Ad</Label>
                <Input
                  value={roleForm.displayName}
                  onChange={(e) => setRoleForm({ ...roleForm, displayName: e.target.value })}
                  placeholder="Yönetiçi"
                  data-testid="input-role-display-name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Açıklama</Label>
              <Textarea
                value={roleForm.description}
                onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                placeholder="Rol açıklamasi..."
                data-testid="textarea-role-description"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Renk
              </Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={roleForm.color}
                  onChange={(e) => setRoleForm({ ...roleForm, color: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer"
                  data-testid="input-role-color"
                />
                <Input
                  value={roleForm.color}
                  onChange={(e) => setRoleForm({ ...roleForm, color: e.target.value })}
                  placeholder="#6366f1"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRole(null)}>
              İptal
            </Button>
            <Button 
              onClick={handleSaveRole}
              disabled={createRoleMutation.isPending || updateRoleMutation.isPending || !roleForm.name || !roleForm.displayName}
              data-testid="button-save-role"
            >
              {createRoleMutation.isPending || updateRoleMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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
      toast({ title: "Başarılı", description: "Duyuru oluşturuldu." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Duyuru oluşturulamadi.", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/announcements/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/announcements'] });
      toast({ title: "Başarılı", description: "Duyuru silindi." });
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
            Yeni Duyuru Oluştur
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
                <option value="warning">Uyarı</option>
                <option value="maintenance">Bakim</option>
                <option value="update">Güncelleme</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>İçerik</Label>
            <Textarea
              value={newAnnouncement.content}
              onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
              placeholder="Duyuru içeriği..."
              data-testid="textarea-announcement-content"
            />
          </div>
          <Button 
            onClick={() => createMutation.mutate(newAnnouncement)}
            disabled={!newAnnouncement.title || !newAnnouncement.content || createMutation.isPending}
            data-testid="button-create-announcement"
          >
            <Plus className="h-4 w-4 mr-2" />
            Duyuru Oluştur
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mevcut Duyurular</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
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
                        {ann.type === "info" ? "Bilgi" : ann.type === "warning" ? "Uyarı" : ann.type === "maintenance" ? "Bakim" : "Güncelleme"}
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
      toast({ title: "Başarılı", description: "Özellik oluşturuldu." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Özellik oluşturulamadi.", variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PlanFeature> }) => 
      apiRequest('PATCH', `/api/plan-features/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/plan-features'] });
      setEditingFeature(null);
      toast({ title: "Başarılı", description: "Özellik güncellendi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Özellik güncellenemedi.", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/plan-features/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/plan-features'] });
      toast({ title: "Başarılı", description: "Özellik silindi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Özellik silinemedi.", variant: "destructive" });
    }
  });

  const categoryLabels: Record<string, string> = {
    core: "Temel",
    communication: "İletişim",
    analytics: "Analitik",
    automation: "Otomasyon",
    integration: "Entegrasyon",
    support: "Destek",
    customization: "Özellestirme",
    general: "Genel"
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Plan Özellikleri Yönetimi
            </CardTitle>
            <CardDescription>Planlara atanabilecek özellikleri yonetin</CardDescription>
          </div>
          <Button onClick={() => setShowNewForm(!showNewForm)} data-testid="button-toggle-new-feature">
            <Plus className="h-4 w-4 mr-2" />
            Yeni Özellik
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
                <Label>Açıklama</Label>
                <Textarea
                  value={newFeature.description}
                  onChange={(e) => setNewFeature({ ...newFeature, description: e.target.value })}
                  placeholder="Özellik açıklamasi..."
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
                  Oluştur
                </Button>
                <Button variant="outline" onClick={() => setShowNewForm(false)}>
                  İptal
                </Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
          ) : features.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Henuz özellik bulunmuyor.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Anahtar</TableHead>
                  <TableHead>Etiket</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Ikon</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>İşlemler</TableHead>
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
            <DialogTitle>Özellik Düzenle</DialogTitle>
            <DialogDescription>Özellik bilgilerini düzenleyin</DialogDescription>
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
                <Label>Açıklama</Label>
                <Textarea
                  value={editingFeature.description || ""}
                  onChange={(e) => setEditingFeature({ ...editingFeature, description: e.target.value })}
                  data-testid="textarea-edit-feature-description"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingFeature(null)}>İptal</Button>
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

// Branding Settings Interface
interface BrandSettings {
  primaryColor: string;
  accentColor: string;
  logoUrl: string;
  companyName: string;
}

function BrandingSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [primaryColor, setPrimaryColor] = useState("#673DE7");
  const [accentColor, setAccentColor] = useState("#CCFF00");
  const [companyName, setCompanyName] = useState("Smartur");
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  
  // Smartur platform logo settings (for admin panel + website footer)
  const [smarturLogoUrl, setSmartutLogoUrl] = useState("/smartur-logo.png");
  const [smarturLinkUrl, setSmartutLinkUrl] = useState("https://www.mysmartur.com");
  const [smarturLogoEnabled, setSmartutLogoEnabled] = useState(true);
  const [smarturSettingsLoaded, setSmartutSettingsLoaded] = useState(false);
  
  // Load existing brand settings (colors only)
  const { data: brandSettings } = useQuery<{ key: string; value: string | null }>({
    queryKey: ['/api/settings', 'brandSettings'],
    queryFn: async () => {
      const res = await fetch('/api/settings/brandSettings');
      return res.json();
    },
  });
  
  // Load Smartur platform settings
  const { data: smarturSettings } = useQuery<Record<string, string | null>>({
    queryKey: ['/api/smartur-settings'],
  });
  
  // Apply brand settings
  useEffect(() => {
    if (brandSettings?.value && !settingsLoaded) {
      try {
        const settings: BrandSettings = JSON.parse(brandSettings.value);
        setPrimaryColor(settings.primaryColor || "#673DE7");
        setAccentColor(settings.accentColor || "#CCFF00");
        setCompanyName(settings.companyName || "Smartur");
        setSettingsLoaded(true);
      } catch {}
    }
  }, [brandSettings, settingsLoaded]);
  
  // Apply Smartur settings
  useEffect(() => {
    if (smarturSettings && !smarturSettingsLoaded) {
      setSmartutLogoUrl(smarturSettings.footer_logo_url || "/smartur-logo.png");
      setSmartutLinkUrl(smarturSettings.footer_link_url || "https://www.mysmartur.com");
      setSmartutLogoEnabled(smarturSettings.footer_enabled !== "false");
      setSmartutSettingsLoaded(true);
    }
  }, [smarturSettings, smarturSettingsLoaded]);
  
  // Save brand settings (colors)
  const saveBrandMutation = useMutation({
    mutationFn: async (settings: BrandSettings) => {
      return apiRequest("POST", "/api/settings/brandSettings", { value: JSON.stringify(settings) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings', 'brandSettings'] });
    },
  });
  
  // Save Smartur platform settings
  const saveSmartutMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PUT", "/api/smartur-settings", {
        footer_logo_url: smarturLogoUrl,
        footer_link_url: smarturLinkUrl,
        footer_enabled: smarturLogoEnabled,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/smartur-settings'] });
    },
  });
  
  const handleSave = async () => {
    try {
      await Promise.all([
        saveBrandMutation.mutateAsync({
          primaryColor,
          accentColor,
          companyName,
          logoUrl: smarturLogoUrl,
        }),
        saveSmartutMutation.mutateAsync(),
      ]);
      toast({ title: "Başarılı", description: "Marka ayarları kaydedildi." });
    } catch {
      toast({ title: "Hata", description: "Marka ayarları kaydedilemedi.", variant: "destructive" });
    }
  };
  
  const isSaving = saveBrandMutation.isPending || saveSmartutMutation.isPending;
  
  // Convert hex to HSL for preview
  const hexToHsl = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Marka Ayarları
          </CardTitle>
          <CardDescription>
            Rezervasyon asistani için renk paleti ve logo ayarları
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Company Name */}
          <div className="space-y-2">
            <Label htmlFor="companyName">Şirket/Marka Adı</Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Smartur"
              data-testid="input-company-name"
            />
          </div>
          
          {/* Colors Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Primary Color */}
            <div className="space-y-3">
              <Label>Ana Renk (Primary)</Label>
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-lg border-2 border-border cursor-pointer"
                  style={{ backgroundColor: primaryColor }}
                  onClick={() => document.getElementById('primaryColorInput')?.click()}
                />
                <input
                  type="color"
                  id="primaryColorInput"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="sr-only"
                  data-testid="input-primary-color"
                />
                <div className="flex-1">
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#673DE7"
                    className="font-mono"
                    data-testid="input-primary-color-hex"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    HSL: {hexToHsl(primaryColor)}
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Butonlar, vurgular ve ana UI elemanlarinda kullanilir
              </p>
            </div>
            
            {/* Accent Color */}
            <div className="space-y-3">
              <Label>Vurgu Rengi (Accent)</Label>
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-lg border-2 border-border cursor-pointer"
                  style={{ backgroundColor: accentColor }}
                  onClick={() => document.getElementById('accentColorInput')?.click()}
                />
                <input
                  type="color"
                  id="accentColorInput"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="sr-only"
                  data-testid="input-accent-color"
                />
                <div className="flex-1">
                  <Input
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    placeholder="#CCFF00"
                    className="font-mono"
                    data-testid="input-accent-color-hex"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    HSL: {hexToHsl(accentColor)}
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Özel vurgular ve dikkat cekiçi elemanlarda kullanilir
              </p>
            </div>
          </div>
          
          {/* Smartur Platform Logo */}
          <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Smartur Platform Logosu</Label>
                <p className="text-sm text-muted-foreground">
                  Bu logo hem admin panelinde hem de tüm acenta web sitelerinin footer'ında gösterilir
                </p>
              </div>
              <Switch
                checked={smarturLogoEnabled}
                onCheckedChange={setSmartutLogoEnabled}
                data-testid="switch-smartur-logo-enabled"
              />
            </div>
            
            <ImageUpload
              value={smarturLogoUrl}
              onChange={setSmartutLogoUrl}
              label="Smartur Logosu"
              size="small"
              placeholder="/smartur-logo.png"
              recommendedSize="Önerilen boyut: 200x50 piksel, maksimum 100KB"
            />
            
            <div className="space-y-2">
              <Label htmlFor="smarturLinkUrl">Logo Yönlendirme URL</Label>
              <Input
                id="smarturLinkUrl"
                value={smarturLinkUrl}
                onChange={(e) => setSmartutLinkUrl(e.target.value)}
                placeholder="https://www.mysmartur.com"
                data-testid="input-smartur-link-url"
              />
              <p className="text-xs text-muted-foreground">
                Logoya tıklandığında yönlendirilecek adres
              </p>
            </div>
          </div>
          
          {/* Preview Section */}
          <div className="border rounded-lg p-4 space-y-4">
            <Label className="text-sm font-medium">Canli Onizleme</Label>
            <div className="flex items-center gap-4 flex-wrap">
              <Button 
                style={{ 
                  backgroundColor: primaryColor,
                  borderColor: primaryColor,
                }}
                className="text-white"
              >
                Primary Buton
              </Button>
              <Button 
                variant="outline"
                style={{ 
                  borderColor: primaryColor,
                  color: primaryColor,
                }}
              >
                Outline Buton
              </Button>
              <Badge 
                style={{ 
                  backgroundColor: accentColor,
                  color: '#000',
                }}
              >
                Accent Badge
              </Badge>
              <div 
                className="px-4 py-2 rounded-lg text-white text-sm"
                style={{ backgroundColor: primaryColor }}
              >
                {companyName}
              </div>
            </div>
          </div>
        </CardContent>
        <CardContent className="pt-0">
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setPrimaryColor("#673DE7");
                setAccentColor("#CCFF00");
                setCompanyName("Smartur");
                setSmartutLogoUrl("/smartur-logo.png");
                setSmartutLinkUrl("https://www.mysmartur.com");
                setSmartutLogoEnabled(true);
              }}
              data-testid="button-reset-branding"
            >
              Varsayılana Don
            </Button>
            <Button 
              onClick={handleSave}
              disabled={isSaving}
              data-testid="button-save-branding"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Kaydet
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Kullanim Bilgisi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Bu ayarlar kaydedildikten sonra rezervasyon asistani arayuzunde uygulanir.</p>
            <p>Değişikliklerin gorunmesi için sayfayi yenilemeniz gerekebilir.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Popup Appearance Settings Interface
interface PopupAppearanceSettings {
  backgroundColor: string;
  backgroundOpacity: number;
  borderColor: string;
  borderOpacity: number;
  blurIntensity: 'none' | 'low' | 'medium' | 'high' | 'ultra';
}

function PopupAppearanceSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [backgroundOpacity, setBackgroundOpacity] = useState(70);
  const [borderColor, setBorderColor] = useState("#ffffff");
  const [borderOpacity, setBorderOpacity] = useState(30);
  const [blurIntensity, setBlurIntensity] = useState<'none' | 'low' | 'medium' | 'high' | 'ultra'>('high');
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  
  const blurOptions = [
    { value: 'none', label: 'Yok', blur: '0' },
    { value: 'low', label: 'Düşük', blur: '8px' },
    { value: 'medium', label: 'Orta', blur: '12px' },
    { value: 'high', label: 'Yüksek', blur: '24px' },
    { value: 'ultra', label: 'Ultra', blur: '40px' },
  ];
  
  const { data: popupSettings } = useQuery<{ key: string; value: string | null }>({
    queryKey: ['/api/settings', 'popupAppearance'],
    queryFn: async () => {
      const res = await fetch('/api/settings/popupAppearance');
      return res.json();
    },
  });
  
  useEffect(() => {
    if (popupSettings?.value && !settingsLoaded) {
      try {
        const settings: PopupAppearanceSettings = JSON.parse(popupSettings.value);
        setBackgroundColor(settings.backgroundColor || "#ffffff");
        setBackgroundOpacity(settings.backgroundOpacity ?? 70);
        setBorderColor(settings.borderColor || "#ffffff");
        setBorderOpacity(settings.borderOpacity ?? 30);
        setBlurIntensity(settings.blurIntensity || 'high');
        setSettingsLoaded(true);
      } catch {}
    }
  }, [popupSettings, settingsLoaded]);
  
  const saveMutation = useMutation({
    mutationFn: async (settings: PopupAppearanceSettings) => {
      return apiRequest("POST", "/api/settings/popupAppearance", { value: JSON.stringify(settings) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings', 'popupAppearance'] });
      applyPopupStyles();
      toast({ title: "Başarılı", description: "Popup görünüm ayarları kaydedildi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Ayarlar kaydedilemedi.", variant: "destructive" });
    },
  });
  
  const applyPopupStyles = () => {
    const root = document.documentElement;
    const bgOpacity = backgroundOpacity / 100;
    const borderOp = borderOpacity / 100;
    const blur = blurOptions.find(b => b.value === blurIntensity)?.blur || '24px';
    
    root.style.setProperty('--popup-bg-color', backgroundColor);
    root.style.setProperty('--popup-bg-opacity', bgOpacity.toString());
    root.style.setProperty('--popup-border-color', borderColor);
    root.style.setProperty('--popup-border-opacity', borderOp.toString());
    root.style.setProperty('--popup-blur', blur);
  };
  
  useEffect(() => {
    if (settingsLoaded) {
      applyPopupStyles();
    }
  }, [settingsLoaded, backgroundColor, backgroundOpacity, borderColor, borderOpacity, blurIntensity]);
  
  const handleSave = () => {
    saveMutation.mutate({
      backgroundColor,
      backgroundOpacity,
      borderColor,
      borderOpacity,
      blurIntensity,
    });
  };
  
  const hexToRgba = (hex: string, opacity: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
  };
  
  const previewBlur = blurOptions.find(b => b.value === blurIntensity)?.blur || '24px';
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Popup Görünüm Ayarları
          </CardTitle>
          <CardDescription>
            Sadece toast bildirimlerinin buzlu cam efekti ayarları
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label>Arkaplan Rengi</Label>
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-lg border-2 border-border cursor-pointer"
                  style={{ backgroundColor: backgroundColor }}
                  onClick={() => document.getElementById('popupBgColor')?.click()}
                />
                <input
                  type="color"
                  id="popupBgColor"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="sr-only"
                  data-testid="input-popup-bg-color"
                />
                <Input
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  placeholder="#ffffff"
                  className="font-mono flex-1"
                  data-testid="input-popup-bg-color-hex"
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <Label>Arkaplan Opaklığı: {backgroundOpacity}%</Label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={backgroundOpacity}
                  onChange={(e) => setBackgroundOpacity(Number(e.target.value))}
                  className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                  data-testid="input-popup-bg-opacity"
                />
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={backgroundOpacity}
                  onChange={(e) => setBackgroundOpacity(Math.min(100, Math.max(0, Number(e.target.value))))}
                  className="w-20"
                  data-testid="input-popup-bg-opacity-number"
                />
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label>Kenar Çizgi Rengi</Label>
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-lg border-2 border-border cursor-pointer"
                  style={{ backgroundColor: borderColor }}
                  onClick={() => document.getElementById('popupBorderColor')?.click()}
                />
                <input
                  type="color"
                  id="popupBorderColor"
                  value={borderColor}
                  onChange={(e) => setBorderColor(e.target.value)}
                  className="sr-only"
                  data-testid="input-popup-border-color"
                />
                <Input
                  value={borderColor}
                  onChange={(e) => setBorderColor(e.target.value)}
                  placeholder="#ffffff"
                  className="font-mono flex-1"
                  data-testid="input-popup-border-color-hex"
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <Label>Kenar Çizgi Opaklığı: {borderOpacity}%</Label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={borderOpacity}
                  onChange={(e) => setBorderOpacity(Number(e.target.value))}
                  className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                  data-testid="input-popup-border-opacity"
                />
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={borderOpacity}
                  onChange={(e) => setBorderOpacity(Math.min(100, Math.max(0, Number(e.target.value))))}
                  className="w-20"
                  data-testid="input-popup-border-opacity-number"
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <Label>Bulanıklık Yoğunluğu</Label>
            <Select value={blurIntensity} onValueChange={(v) => setBlurIntensity(v as any)}>
              <SelectTrigger data-testid="select-blur-intensity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {blurOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label} ({option.blur})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="border rounded-lg p-4 space-y-4">
            <Label className="text-sm font-medium">Canlı Önizleme</Label>
            <div 
              className="relative h-48 rounded-lg overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)'
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div 
                  className="p-6 rounded-xl shadow-xl max-w-xs text-center"
                  style={{
                    backgroundColor: hexToRgba(backgroundColor, backgroundOpacity),
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: hexToRgba(borderColor, borderOpacity),
                    backdropFilter: `blur(${previewBlur}) saturate(150%)`,
                    WebkitBackdropFilter: `blur(${previewBlur}) saturate(150%)`,
                  }}
                >
                  <h4 className="font-semibold text-foreground mb-2">Bildirim Başlığı</h4>
                  <p className="text-sm text-foreground/80">Bu bir örnek popup bildirim içeriğidir.</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        <CardContent className="pt-0">
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setBackgroundColor("#ffffff");
                setBackgroundOpacity(70);
                setBorderColor("#ffffff");
                setBorderOpacity(30);
                setBlurIntensity('high');
              }}
              data-testid="button-reset-popup-appearance"
            >
              Varsayılana Dön
            </Button>
            <Button 
              onClick={handleSave}
              disabled={saveMutation.isPending}
              data-testid="button-save-popup-appearance"
            >
              {saveMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Kaydet
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Smartur Websiteleri Ayarları Section - Sadece Önizleme (Logo ayarları Marka Ayarları'nda)
function SmartutWebsitesSection() {
  const { data: smarturSettings, isLoading } = useQuery<Record<string, string | null>>({
    queryKey: ['/api/smartur-settings'],
  });

  const footerLogoUrl = smarturSettings?.footer_logo_url || "/smartur-logo.png";
  const footerLinkUrl = smarturSettings?.footer_link_url || "https://www.mysmartur.com";
  const footerEnabled = smarturSettings?.footer_enabled !== "false";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Globe className="h-6 w-6 text-primary" />
          Smartur Websiteleri
        </h2>
        <p className="text-muted-foreground mt-1">
          Tüm acenta web sitelerinin footer alanında gösterilecek Smartur logosu önizlemesi
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Footer Önizleme
          </CardTitle>
          <CardDescription>
            Acenta web sitelerinde footer'ın nasıl görüneceğinin örneği
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-6 bg-card">
            <div className="flex flex-col items-center justify-center gap-2 text-center">
              <p className="text-xs text-muted-foreground">Powered by</p>
              {footerEnabled ? (
                <a 
                  href={footerLinkUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  <img 
                    src={footerLogoUrl} 
                    alt="Smartur" 
                    className="h-6 w-auto object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='24' viewBox='0 0 100 24'%3E%3Crect fill='%23f0f0f0' width='100' height='24'/%3E%3Ctext x='50' y='16' text-anchor='middle' fill='%23999' font-size='10'%3ESmartur%3C/text%3E%3C/svg%3E";
                    }}
                  />
                </a>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  Logo Devre Dışı
                </Badge>
              )}
            </div>
          </div>
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
            <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
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
                <div className="text-sm text-muted-foreground">Ödeme Yapan</div>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-bold">{formatCurrency(platformAnalytics.mrrTl, "TL")}</div>
                <div className="text-sm text-muted-foreground">Aylık Gelir (TL)</div>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-bold">{formatCurrency(platformAnalytics.mrrUsd, "USD")}</div>
                <div className="text-sm text-muted-foreground">Aylık Gelir (USD)</div>
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
          <CardDescription>Son 30 günlük WhatsApp mesaj istatistikleri</CardDescription>
        </CardHeader>
        <CardContent>
          {whatsappLoading ? (
            <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
          ) : whatsappStats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-bold">{whatsappStats.totalMessagesThisMonth}</div>
                <div className="text-sm text-muted-foreground">Toplam Mesaj</div>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">{whatsappStats.userMessages}</div>
                <div className="text-sm text-muted-foreground">Müşteri Mesajı</div>
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
                <div className="text-sm text-muted-foreground">Benzersiz Müşteri</div>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-bold">{whatsappStats.avgResponseTimeMs}ms</div>
                <div className="text-sm text-muted-foreground">Ort. Yanit Süresi</div>
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
          Fatura Yönetimi
        </CardTitle>
        <CardDescription>Tum acentalarin faturalari ve ödeme durumlari</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
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
                <TableHead>Son Ödeme</TableHead>
                <TableHead>Oluşturulma</TableHead>
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
      toast({ title: "Başarılı", description: "API durumlari kontrol edildi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "API kontrolu yapılamadı.", variant: "destructive" });
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
    paytr: 'PayTR Ödeme'
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5" />
            API Durum İzleme
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
          <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
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
                          {status.status === 'up' ? 'Çalışıyor' : 
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
      if (!res.ok) throw new Error('Aktivasyon başarısız');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/app-versions'] });
      toast({ title: "Başarılı", description: "Sürüm aktif edildi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Sürüm aktif edilemedi.", variant: "destructive" });
    }
  });

  const rollbackMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = localStorage.getItem('superAdminToken');
      const res = await fetch(`/api/app-versions/${id}/rollback`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Geri alma başarısız');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/app-versions'] });
      setRollbackDialogOpen(false);
      setSelectedRollbackVersion(null);
      toast({ title: "Başarılı", description: "Önceki sürüme geri donuldu." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Geri alma başarısız.", variant: "destructive" });
    }
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.tar.gz') && !file.name.endsWith('.zip')) {
        toast({ 
          title: "Geçersiz Dosya", 
          description: "Lutfen .tar.gz veya .zip dosyası seçin", 
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
      toast({ title: "Hata", description: "Sürüm numarası giriniz", variant: "destructive" });
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
          notes: 'Yüklenen güncelleme dosyası'
        })
      });
      
      if (!createRes.ok) {
        const err = await createRes.json();
        throw new Error(err.error || 'Sürüm oluşturulamadi');
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
              toast({ title: "Başarılı", description: "Güncelleme yüklendi ve aktif edildi. Önceki sürüm yedeklendi." });
            } else {
              toast({ title: "Uyarı", description: "Güncelleme yüklendi ancak otomatik aktivasyon yapılamadı." });
            }
          } catch {
            toast({ title: "Uyarı", description: "Güncelleme yüklendi ancak aktivasyon sirasinda hata olustu." });
          }
          setSelectedFile(null);
          setVersionInput("");
          refetch();
          refetchVersions();
        } else {
          let errorMsg = "Yükleme başarısız";
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
        toast({ title: "Hata", description: "Yükleme başarısız", variant: "destructive" });
        setIsUploading(false);
        setUploadProgress(0);
      };

      xhr.send(formData);
    } catch (err: any) {
      toast({ title: "Hata", description: err.message || "Yükleme başarısız", variant: "destructive" });
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
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Başarısız</Badge>;
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
          <CardDescription>Mevcut sistem sürümu ve durum bilgileri</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
          ) : versionInfo ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 border rounded-lg">
                <Package className="h-8 w-8 text-primary" />
                <div>
                  <div className="text-sm text-muted-foreground">Sürüm</div>
                  <div className="text-lg font-semibold">{versionInfo.version}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 border rounded-lg">
                <Clock className="h-8 w-8 text-blue-500" />
                <div>
                  <div className="text-sm text-muted-foreground">Çalışma Süresi</div>
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
              Sistem bilgisi alınamadı
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Uygulama Güncelleme
          </CardTitle>
          <CardDescription>
            Sistemi güncellemek için yeni sürüm dosyasıni yükleyin. Önceki sürüm otomatik olarak yedeklenir.
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
                Dosya secmek için tıklayın veya surukleyin
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
                <Label htmlFor="version-input">Sürüm Numarası</Label>
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
                    Yükleniyor... {uploadProgress}%
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Yükle ve Aktif Et
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
              Yeni sürüm yüklendiginde mevcut sürüm otomatik olarak yedeklenir. Herhangi bir sorun durumunda önceki sürüme geri donebilirsiniz.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Sürüm Geçmişi
          </CardTitle>
          <CardDescription>Yüklenen sürümler ve geri alma seçenekleri</CardDescription>
        </CardHeader>
        <CardContent>
          {versionsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
          ) : storedVersions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Henuz sürüm geçmişi bulunmuyor. Ilk güncellemenizi yükleyerek baslayin.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sürüm</TableHead>
                  <TableHead>Dosya</TableHead>
                  <TableHead>Boyut</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
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
                          <span className="text-xs text-muted-foreground">Aktif sürüm</span>
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
            Yedek İndirme
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
            Yedegi İndir
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
              Sürümu Geri Al
            </DialogTitle>
            <DialogDescription>
              {selectedRollbackVersion && (
                <>
                  <strong>{selectedRollbackVersion.version}</strong> sürümune geri donmek uzeresiniz.
                  Bu işlem mevcut sürümu pasif hale getirecek ve secilen sürümu aktif edecektir.
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
              <li>Sistem geciiçi olarak durdurulabilir</li>
              <li>Mevcut sürümdeki değişiklikler korunacak</li>
              <li>Geri alma işlemi geri alınabilir</li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRollbackDialogOpen(false)}>
              İptal
            </Button>
            <Button
              onClick={() => selectedRollbackVersion && rollbackMutation.mutate(selectedRollbackVersion.id)}
              disabled={rollbackMutation.isPending}
              data-testid="button-confirm-rollback"
            >
              {rollbackMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  İşleniyor...
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

interface EnrichedSupportRequest extends SupportRequest {
  tenantName?: string;
}

function AgencySupportSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loadingLogs, setLoadingLogs] = useState<number | null>(null);
  
  const { data: allRequests = [], isLoading } = useQuery<EnrichedSupportRequest[]>({
    queryKey: ['/api/support-requests'],
  });

  // Filter only form-based requests (those starting with "[")
  const formRequests = allRequests.filter(r => r.phone.startsWith('['));
  const openRequests = formRequests.filter(r => r.status === 'open');
  const resolvedRequests = formRequests.filter(r => r.status === 'resolved');
  
  // Download logs for a support request
  const downloadLogs = async (requestId: number) => {
    try {
      setLoadingLogs(requestId);
      const response = await fetch(`/api/support-requests/${requestId}/logs`);
      const logs = await response.json();
      
      // Create downloadable content
      let content = `Destek Talebi #${requestId} - Sistem Logları\n`;
      content += `İndirme Tarihi: ${new Date().toLocaleString('tr-TR')}\n`;
      content += '='.repeat(60) + '\n\n';
      
      for (const log of logs) {
        content += `[${log.logCreatedAt ? new Date(log.logCreatedAt).toLocaleString('tr-TR') : '-'}] `;
        content += `[${log.logLevel?.toUpperCase() || 'INFO'}] `;
        content += `[${log.logSource || '-'}] `;
        content += `${log.logMessage || '-'}\n`;
        if (log.logDetails) {
          content += `  Detaylar: ${typeof log.logDetails === 'string' ? log.logDetails : JSON.stringify(log.logDetails)}\n`;
        }
        if (log.messageSnapshot) {
          content += `  Mesaj Gecmisi: ${log.messageSnapshot}\n`;
        }
        content += '\n';
      }
      
      // Trigger download
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `destek-talebi-${requestId}-loglar.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({ title: "Başarılı", description: "Loglar indirildi." });
    } catch (error) {
      toast({ title: "Hata", description: "Loglar indirilemedi.", variant: "destructive" });
    } finally {
      setLoadingLogs(null);
    }
  };

  const resolveMutation = useMutation({
    mutationFn: (id: number) => apiRequest('POST', `/api/support-requests/${id}/resolve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/support-requests'] });
      toast({ title: "Başarılı", description: "Talep cozuldu olarak isaretlendi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Talep güncellenemedi.", variant: "destructive" });
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
        return <Badge variant="secondary"><RefreshCw className="h-3 w-3 mr-1" />Güncelleme</Badge>;
      case 'Öneri':
        return <Badge variant="outline"><Star className="h-3 w-3 mr-1" />Öneri</Badge>;
      case 'Soru':
        return <Badge variant="outline"><HelpCircle className="h-3 w-3 mr-1" />Soru</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  // Notification email settings
  const [notificationEmail, setNotificationEmail] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  
  // SMTP configuration
  const [smtpConfig, setSmtpConfig] = useState({
    host: '',
    port: '587',
    secure: false,
    username: '',
    password: '',
    fromEmail: '',
    fromName: 'Smartur',
  });
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  
  const { data: notificationSettings } = useQuery<{ notificationEmail: string }>({
    queryKey: ['/api/platform/notification-settings'],
  });
  
  const { data: smtpSettings } = useQuery<{ 
    configured: boolean; 
    host?: string;
    port?: number;
    secure?: boolean;
    username?: string;
    fromEmail?: string;
    fromName?: string;
  }>({
    queryKey: ['/api/platform/smtp-config'],
  });
  
  useEffect(() => {
    if (notificationSettings?.notificationEmail) {
      setNotificationEmail(notificationSettings.notificationEmail);
    }
  }, [notificationSettings]);
  
  useEffect(() => {
    if (smtpSettings?.configured) {
      setSmtpConfig({
        host: smtpSettings.host || '',
        port: String(smtpSettings.port || 587),
        secure: smtpSettings.secure || false,
        username: smtpSettings.username || '',
        password: '',
        fromEmail: smtpSettings.fromEmail || '',
        fromName: smtpSettings.fromName || 'Smartur',
      });
    }
  }, [smtpSettings]);
  
  const saveNotificationEmail = async () => {
    setEmailSaving(true);
    try {
      await apiRequest('POST', '/api/platform/notification-settings', { notificationEmail });
      toast({ title: "Başarılı", description: "Bildirim e-postası kaydedildi." });
    } catch (error) {
      toast({ title: "Hata", description: "E-posta kaydedilemedi.", variant: "destructive" });
    } finally {
      setEmailSaving(false);
    }
  };
  
  const saveSmtpConfig = async () => {
    setSmtpSaving(true);
    try {
      await apiRequest('POST', '/api/platform/smtp-config', smtpConfig);
      queryClient.invalidateQueries({ queryKey: ['/api/platform/smtp-config'] });
      toast({ title: "Başarılı", description: "SMTP yapılandırması kaydedildi." });
    } catch (error) {
      toast({ title: "Hata", description: "SMTP ayarları kaydedilemedi.", variant: "destructive" });
    } finally {
      setSmtpSaving(false);
    }
  };
  
  const testSmtpConnection = async () => {
    setSmtpTesting(true);
    try {
      const result = await apiRequest('POST', '/api/platform/smtp-config/test', {});
      toast({ title: "Başarılı", description: "SMTP bağlantısı başarılı!" });
    } catch (error: any) {
      toast({ title: "Hata", description: error?.message || "Bağlantı testi başarısız.", variant: "destructive" });
    } finally {
      setSmtpTesting(false);
    }
  };
  
  const deleteSmtpConfig = async () => {
    try {
      await apiRequest('DELETE', '/api/platform/smtp-config');
      queryClient.invalidateQueries({ queryKey: ['/api/platform/smtp-config'] });
      setSmtpConfig({
        host: '',
        port: '587',
        secure: false,
        username: '',
        password: '',
        fromEmail: '',
        fromName: 'Smartur',
      });
      toast({ title: "Başarılı", description: "SMTP yapılandırması kaldırıldı." });
    } catch (error) {
      toast({ title: "Hata", description: "SMTP ayarları silinemedi.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      {/* SMTP Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              SMTP Yapılandırması
              {smtpSettings?.configured && (
                <Badge variant="default">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Yapılandırıldı
                </Badge>
              )}
            </div>
          </CardTitle>
          <CardDescription>Tüm platform e-postaları için merkezi SMTP sunucu ayarları</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtp-host">SMTP Sunucu</Label>
              <Input
                id="smtp-host"
                placeholder="smtp.gmail.com"
                value={smtpConfig.host}
                onChange={(e) => setSmtpConfig({...smtpConfig, host: e.target.value})}
                data-testid="input-smtp-host"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-port">Port</Label>
              <Input
                id="smtp-port"
                placeholder="587"
                value={smtpConfig.port}
                onChange={(e) => setSmtpConfig({...smtpConfig, port: e.target.value})}
                data-testid="input-smtp-port"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-username">Kullanıcı Adı (E-posta)</Label>
              <Input
                id="smtp-username"
                placeholder="noreply@example.com"
                value={smtpConfig.username}
                onChange={(e) => setSmtpConfig({...smtpConfig, username: e.target.value})}
                data-testid="input-smtp-username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-password">Şifre</Label>
              <div className="relative">
                <Input
                  id="smtp-password"
                  type={showSmtpPassword ? "text" : "password"}
                  placeholder={smtpSettings?.configured ? "••••••••" : "Şifre veya uygulama şifresi"}
                  value={smtpConfig.password}
                  onChange={(e) => setSmtpConfig({...smtpConfig, password: e.target.value})}
                  data-testid="input-smtp-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0"
                  onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                >
                  {showSmtpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-from-email">Gönderici E-posta</Label>
              <Input
                id="smtp-from-email"
                placeholder="noreply@example.com"
                value={smtpConfig.fromEmail}
                onChange={(e) => setSmtpConfig({...smtpConfig, fromEmail: e.target.value})}
                data-testid="input-smtp-from-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-from-name">Gönderici Adı</Label>
              <Input
                id="smtp-from-name"
                placeholder="Smartur"
                value={smtpConfig.fromName}
                onChange={(e) => setSmtpConfig({...smtpConfig, fromName: e.target.value})}
                data-testid="input-smtp-from-name"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="smtp-secure"
              checked={smtpConfig.secure}
              onCheckedChange={(checked) => setSmtpConfig({...smtpConfig, secure: checked})}
              data-testid="switch-smtp-secure"
            />
            <Label htmlFor="smtp-secure">SSL/TLS Kullan (Port 465 için)</Label>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button 
              onClick={saveSmtpConfig}
              disabled={smtpSaving || !smtpConfig.host || !smtpConfig.username || (!smtpSettings?.configured && !smtpConfig.password)}
              data-testid="button-save-smtp"
            >
              <Save className="h-4 w-4 mr-1" />
              {smtpSaving ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
            {smtpSettings?.configured && (
              <>
                <Button 
                  variant="outline"
                  onClick={testSmtpConnection}
                  disabled={smtpTesting}
                  data-testid="button-test-smtp"
                >
                  <Wifi className="h-4 w-4 mr-1" />
                  {smtpTesting ? 'Test Ediliyor...' : 'Bağlantıyı Test Et'}
                </Button>
                <Button 
                  variant="destructive"
                  onClick={deleteSmtpConfig}
                  data-testid="button-delete-smtp"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Kaldır
                </Button>
              </>
            )}
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <p><strong>Gmail için:</strong> smtp.gmail.com, Port 587, Uygulama şifresi kullanın</p>
            <p><strong>Outlook için:</strong> smtp.office365.com, Port 587</p>
          </div>
        </CardContent>
      </Card>
      
      {/* Notification Email Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Bildirim Alıcısı
          </CardTitle>
          <CardDescription>Yeni destek talebi geldiğinde bildirim alacak e-posta adresini ayarlayın</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input
              type="email"
              placeholder="bildirim@example.com"
              value={notificationEmail}
              onChange={(e) => setNotificationEmail(e.target.value)}
              className="max-w-md"
              data-testid="input-notification-email"
            />
            <Button 
              onClick={saveNotificationEmail}
              disabled={emailSaving}
              data-testid="button-save-notification-email"
            >
              <Save className="h-4 w-4 mr-1" />
              {emailSaving ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            SMTP yapılandırması gereklidir. Yukarıdaki SMTP ayarlarını yapılandırın.
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Ajans Destek Talepleri
              {openRequests.length > 0 && (
                <Badge variant="destructive">{openRequests.length} Açık</Badge>
              )}
            </div>
          </CardTitle>
          <CardDescription>Acentalardan gelen destek talepleri (form uzerinden)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
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
                          {req.tenantName && (
                            <Badge variant="secondary">
                              <Building className="h-3 w-3 mr-1" />
                              {req.tenantName}
                            </Badge>
                          )}
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => downloadLogs(req.id)}
                          disabled={loadingLogs === req.id}
                          data-testid={`button-download-logs-${req.id}`}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          {loadingLogs === req.id ? 'Yükleniyor...' : 'Loglar'}
                        </Button>
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
                          {req.tenantName && <div><strong>Acente:</strong> {req.tenantName}</div>}
                          <div><strong>Talep Turu:</strong> {info.type}</div>
                          <div><strong>Gönderen:</strong> {info.name} {info.email ? `<${info.email}>` : ''}</div>
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
  const [newAdmin, setNewAdmin] = useState({ email: '', name: '', password: '', role: 'admin' });

  const { data: admins = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/platform-admins'],
  });

  const createMutation = useMutation({
    mutationFn: (admin: any) => apiRequest('POST', '/api/platform-admins', admin),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/platform-admins'] });
      toast({ title: "Başarılı", description: "Yönetiçi eklendi." });
      setShowAddDialog(false);
      setNewAdmin({ email: '', name: '', password: '', role: 'admin' });
    },
    onError: () => {
      toast({ title: "Hata", description: "Yönetiçi eklenemedi.", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/platform-admins/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/platform-admins'] });
      toast({ title: "Başarılı", description: "Yönetiçi silindi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Yönetiçi silinemedi.", variant: "destructive" });
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Platform Yönetiçileri
          </div>
          <Button size="sm" onClick={() => setShowAddDialog(true)} data-testid="button-add-admin">
            <Plus className="h-4 w-4 mr-1" />
            Yönetiçi Ekle
          </Button>
        </CardTitle>
        <CardDescription>Platform yönetiçilerini yonetin</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
        ) : admins.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Henuz yönetiçi bulunmuyor.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ad</TableHead>
                <TableHead>E-posta</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Oluşturma</TableHead>
                <TableHead>İşlemler</TableHead>
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
            <DialogTitle>Yeni Yönetiçi Ekle</DialogTitle>
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
            <div className="space-y-2">
              <Label>Şifre</Label>
              <Input
                type="password"
                value={newAdmin.password}
                onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                placeholder="Guclu bir şifre girin"
                data-testid="input-admin-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>İptal</Button>
            <Button
              onClick={() => createMutation.mutate(newAdmin)}
              disabled={createMutation.isPending || !newAdmin.email || !newAdmin.password || !newAdmin.name}
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

function SmtpConfigSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [smtpConfig, setSmtpConfig] = useState({
    host: '',
    port: '587',
    secure: false,
    username: '',
    password: '',
    fromEmail: '',
    fromName: 'Smartur',
  });
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);

  const { data: smtpSettings } = useQuery<{ 
    configured: boolean;
    host?: string;
    port?: number;
    secure?: boolean;
    username?: string;
    fromEmail?: string;
    fromName?: string;
  }>({
    queryKey: ['/api/platform/smtp-config'],
  });

  useEffect(() => {
    if (smtpSettings?.configured) {
      setSmtpConfig({
        host: smtpSettings.host || '',
        port: String(smtpSettings.port || 587),
        secure: smtpSettings.secure || false,
        username: smtpSettings.username || '',
        password: '',
        fromEmail: smtpSettings.fromEmail || '',
        fromName: smtpSettings.fromName || 'Smartur',
      });
    }
  }, [smtpSettings]);

  const saveSmtpConfig = async () => {
    setSmtpSaving(true);
    try {
      await apiRequest('POST', '/api/platform/smtp-config', smtpConfig);
      queryClient.invalidateQueries({ queryKey: ['/api/platform/smtp-config'] });
      toast({ title: "Başarılı", description: "SMTP yapılandırması kaydedildi." });
    } catch (error) {
      toast({ title: "Hata", description: "SMTP ayarları kaydedilemedi.", variant: "destructive" });
    } finally {
      setSmtpSaving(false);
    }
  };

  const testSmtpConnection = async () => {
    setSmtpTesting(true);
    try {
      await apiRequest('POST', '/api/platform/smtp-config/test', {});
      toast({ title: "Başarılı", description: "SMTP bağlantısı başarılı!" });
    } catch (error: any) {
      toast({ title: "Hata", description: error?.message || "Bağlantı testi başarısız.", variant: "destructive" });
    } finally {
      setSmtpTesting(false);
    }
  };

  const deleteSmtpConfig = async () => {
    try {
      await apiRequest('DELETE', '/api/platform/smtp-config');
      queryClient.invalidateQueries({ queryKey: ['/api/platform/smtp-config'] });
      setSmtpConfig({
        host: '',
        port: '587',
        secure: false,
        username: '',
        password: '',
        fromEmail: '',
        fromName: 'Smartur',
      });
      toast({ title: "Başarılı", description: "SMTP yapılandırması kaldırıldı." });
    } catch (error) {
      toast({ title: "Hata", description: "SMTP ayarları silinemedi.", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            SMTP Yapılandırması
            {smtpSettings?.configured && (
              <Badge variant="default">
                <CheckCircle className="h-3 w-3 mr-1" />
                Yapılandırıldı
              </Badge>
            )}
          </div>
        </CardTitle>
        <CardDescription>Tüm platform e-postaları için merkezi SMTP sunucu ayarları</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="smtp-host">SMTP Sunucu</Label>
            <Input
              id="smtp-host"
              placeholder="smtp.gmail.com"
              value={smtpConfig.host}
              onChange={(e) => setSmtpConfig({...smtpConfig, host: e.target.value})}
              data-testid="input-smtp-host"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtp-port">Port</Label>
            <Input
              id="smtp-port"
              placeholder="587"
              value={smtpConfig.port}
              onChange={(e) => setSmtpConfig({...smtpConfig, port: e.target.value})}
              data-testid="input-smtp-port"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtp-username">Kullanıcı Adı (E-posta)</Label>
            <Input
              id="smtp-username"
              placeholder="noreply@example.com"
              value={smtpConfig.username}
              onChange={(e) => setSmtpConfig({...smtpConfig, username: e.target.value})}
              data-testid="input-smtp-username"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtp-password">Şifre</Label>
            <div className="relative">
              <Input
                id="smtp-password"
                type={showSmtpPassword ? "text" : "password"}
                placeholder={smtpSettings?.configured ? "••••••••" : "Şifre veya uygulama şifresi"}
                value={smtpConfig.password}
                onChange={(e) => setSmtpConfig({...smtpConfig, password: e.target.value})}
                data-testid="input-smtp-password"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0"
                onClick={() => setShowSmtpPassword(!showSmtpPassword)}
              >
                {showSmtpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtp-from-email">Gönderici E-posta</Label>
            <Input
              id="smtp-from-email"
              placeholder="noreply@example.com"
              value={smtpConfig.fromEmail}
              onChange={(e) => setSmtpConfig({...smtpConfig, fromEmail: e.target.value})}
              data-testid="input-smtp-from-email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtp-from-name">Gönderici Adı</Label>
            <Input
              id="smtp-from-name"
              placeholder="Smartur"
              value={smtpConfig.fromName}
              onChange={(e) => setSmtpConfig({...smtpConfig, fromName: e.target.value})}
              data-testid="input-smtp-from-name"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="smtp-secure"
            checked={smtpConfig.secure}
            onCheckedChange={(checked) => setSmtpConfig({...smtpConfig, secure: checked})}
            data-testid="switch-smtp-secure"
          />
          <Label htmlFor="smtp-secure">SSL/TLS Kullan (Port 465 için)</Label>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            onClick={saveSmtpConfig}
            disabled={smtpSaving || !smtpConfig.host || !smtpConfig.username || (!smtpSettings?.configured && !smtpConfig.password)}
            data-testid="button-save-smtp"
          >
            <Save className="h-4 w-4 mr-1" />
            {smtpSaving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
          {smtpSettings?.configured && (
            <>
              <Button 
                variant="outline"
                onClick={testSmtpConnection}
                disabled={smtpTesting}
                data-testid="button-test-smtp"
              >
                <Wifi className="h-4 w-4 mr-1" />
                {smtpTesting ? 'Test Ediliyor...' : 'Bağlantıyı Test Et'}
              </Button>
              <Button 
                variant="destructive"
                onClick={deleteSmtpConfig}
                data-testid="button-delete-smtp"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Kaldır
              </Button>
            </>
          )}
        </div>
        <div className="text-sm text-muted-foreground space-y-1">
          <p><strong>Gmail için:</strong> smtp.gmail.com, Port 587, Uygulama şifresi kullanın</p>
          <p><strong>Outlook için:</strong> smtp.office365.com, Port 587</p>
        </div>
      </CardContent>
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
          Giriş Kayıtları
        </CardTitle>
        <CardDescription>Son giriş işlemleri ve güvenlik kayıtlari</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
        ) : loginLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Henuz giriş kaydi bulunmuyor.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>Kullanıcı</TableHead>
                <TableHead>IP Adresi</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Tarayiçi</TableHead>
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
                      {log.success ? 'Başarılı' : 'Başarısız'}
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
        title: "Başarılı", 
        description: `${data.updated || 0} lisans güncellendi.` 
      });
      setSelectedLicenses([]);
    },
    onError: () => {
      toast({ title: "Hata", description: "Plan değiştirilemedi.", variant: "destructive" });
    }
  });

  const extendMutation = useMutation({
    mutationFn: (data: { licenseIds: number[], days: number }) =>
      apiRequest('POST', '/api/bulk/extend-license', data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/licenses'] });
      toast({ 
        title: "Başarılı", 
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
            Toplu İşlemler
          </CardTitle>
          <CardDescription>Birden fazla lisans uzerinde toplu işlem yapin</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={selectAll}
              data-testid="button-select-all"
            >
              {selectedLicenses.length === licenses.length ? 'Tumunu Kaldır' : 'Tumunu Sec'}
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
                  <CardTitle className="text-base">Plan Değiştir</CardTitle>
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
                    {changePlanMutation.isPending ? "Güncelleniyor..." : "Plani Değiştir"}
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

// === ERROR EVENTS SECTION ===
interface ErrorEvent {
  id: number;
  tenantId: number | null;
  tenantName: string | null;
  severity: string;
  category: string;
  source: string;
  message: string;
  suggestion: string | null;
  requestPath: string | null;
  requestMethod: string | null;
  statusCode: number | null;
  userId: number | null;
  userEmail: string | null;
  metadata: string | null;
  occurredAt: string;
  status: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionNotes: string | null;
}

interface ErrorEventsSummary {
  openCount: number;
  criticalCount: number;
  affectedTenants: number;
  recentEvents: ErrorEvent[];
}

function ErrorEventsSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedEvent, setSelectedEvent] = useState<ErrorEvent | null>(null);
  const [resolveNotes, setResolveNotes] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: summary, isLoading: summaryLoading } = useQuery<ErrorEventsSummary>({
    queryKey: ['/api/admin/error-events/summary'],
    refetchInterval: 30000,
  });

  const { data: eventsData, isLoading: eventsLoading, refetch } = useQuery<{ events: ErrorEvent[], total: number }>({
    queryKey: ['/api/admin/error-events', statusFilter, severityFilter, categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (severityFilter !== "all") params.set("severity", severityFilter);
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      params.set("limit", "50");
      const res = await fetch(`/api/admin/error-events?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error("Hatalar yüklenemedi");
      return res.json();
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes?: string }) => {
      const res = await fetch(`/api/admin/error-events/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error("Hata çözümlenemedi");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/error-events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/error-events/summary'] });
      toast({ title: "Başarılı", description: "Hata çözümlendi olarak işaretlendi." });
      setSelectedEvent(null);
      setResolveNotes("");
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/error-events/${id}/acknowledge`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error("Hata onaylanamadı");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/error-events'] });
      toast({ title: "Başarılı", description: "Hata incelenecek olarak işaretlendi." });
    },
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 text-white';
      case 'error': return 'bg-orange-500 text-white';
      case 'warning': return 'bg-yellow-500 text-black';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      api: 'API',
      validation: 'Doğrulama',
      ai_bot: 'AI Bot',
      system: 'Sistem',
      auth: 'Kimlik Doğrulama',
      database: 'Veritabanı',
      license: 'Lisans',
    };
    return labels[category] || category;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open': return <Badge variant="destructive">Açık</Badge>;
      case 'acknowledged': return <Badge className="bg-yellow-500">İnceleniyor</Badge>;
      case 'resolved': return <Badge variant="secondary">Çözüldü</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Hata İzleme
        </h3>
        <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-refresh-errors">
          <RefreshCw className="h-4 w-4 mr-1" />
          Yenile
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              Açık Hatalar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryLoading ? "..." : summary?.openCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              Kritik Hatalar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{summaryLoading ? "..." : summary?.criticalCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Etkilenen Acentalar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryLoading ? "..." : summary?.affectedTenants || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32" data-testid="select-error-status">
            <SelectValue placeholder="Durum" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tümü</SelectItem>
            <SelectItem value="open">Açık</SelectItem>
            <SelectItem value="acknowledged">İnceleniyor</SelectItem>
            <SelectItem value="resolved">Çözüldü</SelectItem>
          </SelectContent>
        </Select>

        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-32" data-testid="select-error-severity">
            <SelectValue placeholder="Önem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tümü</SelectItem>
            <SelectItem value="critical">Kritik</SelectItem>
            <SelectItem value="error">Hata</SelectItem>
            <SelectItem value="warning">Uyarı</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40" data-testid="select-error-category">
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tümü</SelectItem>
            <SelectItem value="api">API</SelectItem>
            <SelectItem value="validation">Doğrulama</SelectItem>
            <SelectItem value="ai_bot">AI Bot</SelectItem>
            <SelectItem value="system">Sistem</SelectItem>
            <SelectItem value="auth">Kimlik Doğrulama</SelectItem>
            <SelectItem value="database">Veritabanı</SelectItem>
            <SelectItem value="license">Lisans</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Error Events Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Önem</TableHead>
                <TableHead className="w-24">Kategori</TableHead>
                <TableHead>Acenta</TableHead>
                <TableHead>Mesaj</TableHead>
                <TableHead className="w-32">Tarih</TableHead>
                <TableHead className="w-24">Durum</TableHead>
                <TableHead className="w-24">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {eventsLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Yükleniyor...
                  </TableCell>
                </TableRow>
              ) : eventsData?.events?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    Hata bulunamadı
                  </TableCell>
                </TableRow>
              ) : (
                eventsData?.events?.map((event) => (
                  <TableRow key={event.id} className="cursor-pointer" onClick={() => setSelectedEvent(event)}>
                    <TableCell>
                      <Badge className={getSeverityColor(event.severity)}>
                        {event.severity === 'critical' ? 'Kritik' : event.severity === 'error' ? 'Hata' : 'Uyarı'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getCategoryLabel(event.category)}</Badge>
                    </TableCell>
                    <TableCell>{event.tenantName || "Platform"}</TableCell>
                    <TableCell className="max-w-xs truncate">{event.message}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {event.occurredAt ? new Date(event.occurredAt).toLocaleString("tr-TR") : "-"}
                    </TableCell>
                    <TableCell>{getStatusBadge(event.status)}</TableCell>
                    <TableCell>
                      {event.status === 'open' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            acknowledgeMutation.mutate(event.id);
                          }}
                          data-testid={`button-ack-${event.id}`}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Error Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Hata Detayı
            </DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Önem</Label>
                  <div><Badge className={getSeverityColor(selectedEvent.severity)}>{selectedEvent.severity}</Badge></div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Kategori</Label>
                  <div><Badge variant="outline">{getCategoryLabel(selectedEvent.category)}</Badge></div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Acenta</Label>
                  <div>{selectedEvent.tenantName || "Platform"}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Kaynak</Label>
                  <div>{selectedEvent.source}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Tarih</Label>
                  <div>{selectedEvent.occurredAt ? new Date(selectedEvent.occurredAt).toLocaleString("tr-TR") : "-"}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Durum</Label>
                  <div>{getStatusBadge(selectedEvent.status)}</div>
                </div>
              </div>

              {selectedEvent.requestPath && (
                <div>
                  <Label className="text-muted-foreground">Endpoint</Label>
                  <div className="font-mono text-sm bg-muted p-2 rounded">
                    {selectedEvent.requestMethod} {selectedEvent.requestPath}
                    {selectedEvent.statusCode && <span className="ml-2 text-red-500">({selectedEvent.statusCode})</span>}
                  </div>
                </div>
              )}

              <div>
                <Label className="text-muted-foreground">Mesaj</Label>
                <div className="bg-muted p-3 rounded">{selectedEvent.message}</div>
              </div>

              {selectedEvent.suggestion && (
                <div>
                  <Label className="text-muted-foreground">Öneri</Label>
                  <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded text-blue-800 dark:text-blue-200">
                    {selectedEvent.suggestion}
                  </div>
                </div>
              )}

              {selectedEvent.metadata && (
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full">
                      <ChevronDown className="h-4 w-4 mr-1" />
                      Teknik Detaylar
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <pre className="mt-2 bg-muted p-3 rounded text-xs overflow-x-auto max-h-48">
                      {selectedEvent.metadata}
                    </pre>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {selectedEvent.status !== 'resolved' && (
                <div className="space-y-2 pt-4 border-t">
                  <Label>Çözüm Notu (Opsiyonel)</Label>
                  <Textarea
                    value={resolveNotes}
                    onChange={(e) => setResolveNotes(e.target.value)}
                    placeholder="Hatanın nasıl çözüldüğünü not edin..."
                    data-testid="input-resolve-notes"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => resolveMutation.mutate({ id: selectedEvent.id, notes: resolveNotes })}
                      disabled={resolveMutation.isPending}
                      data-testid="button-resolve-error"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Çözüldü Olarak İşaretle
                    </Button>
                  </div>
                </div>
              )}

              {selectedEvent.resolvedAt && (
                <div className="pt-4 border-t text-sm text-muted-foreground">
                  <div>Çözen: {selectedEvent.resolvedBy}</div>
                  <div>Çözüm Tarihi: {new Date(selectedEvent.resolvedAt).toLocaleString("tr-TR")}</div>
                  {selectedEvent.resolutionNotes && <div className="mt-2">Not: {selectedEvent.resolutionNotes}</div>}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
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
          Sistem İzleme
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
              <div className="text-muted-foreground">Yükleniyor...</div>
            ) : dbStats ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Durum</span>
                  <Badge variant={dbStats.status === 'connected' ? 'default' : 'destructive'}>
                    {dbStats.status === 'connected' ? 'Bağlı' : 'Bağlı Degil'}
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Tamamlanan Ödemeler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {summaryLoading ? '...' : summary?.completedPayments || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bekleyen Ödemeler</CardTitle>
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
              Aylık Gelir
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
            <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ay</TableHead>
                  <TableHead className="text-right">Gelir (TL)</TableHead>
                  <TableHead className="text-right">Gelir (USD)</TableHead>
                  <TableHead className="text-right">İşlem Sayısı</TableHead>
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
              Vadesi Geçmiş Faturalar ({overdueInvoices.length})
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
  const [loginEmail, setLoginEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  // Plan management state
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [isNewPlan, setIsNewPlan] = useState(false);
  const [planForm, setPlanForm] = useState<Partial<SubscriptionPlan>>({});
  
  // Navigation state (must be before conditionals)
  const [activeCategory, setActiveCategory] = useState("overview");
  const [activeSubTab, setActiveSubTab] = useState("analytics");
  
  // Check for existing session (session-based auth, no localStorage)
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/platform-admin/session', {
          credentials: 'include'
        });
        const data = await res.json();
        if (data.authenticated) {
          setIsAuthenticated(true);
        }
      } catch {
        // Session check failed, stay logged out
      }
      setIsCheckingAuth(false);
    };
    checkSession();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/bot-rules/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: loginEmail, password })
      });
      const data = await res.json();
      
      if (data.success) {
        setIsAuthenticated(true);
        toast({ title: "Giriş Başarılı", description: "Super Admin paneline hos geldiniz." });
      } else {
        toast({ title: "Hata", description: data.error || "E-posta veya şifre yanlış", variant: "destructive" });
      }
    } catch {
      toast({ title: "Hata", description: "Giriş yapılamadı", variant: "destructive" });
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/platform-admin/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch {
      // Ignore logout errors
    }
    setIsAuthenticated(false);
    setPassword("");
    setLoginEmail("");
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
              Bu panele erişmek için giriş bilgilerinizi girin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="loginEmail">E-posta</Label>
                <Input
                  id="loginEmail"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="admin@smartur.com"
                  required
                  data-testid="input-super-admin-email"
                />
              </div>
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

  const mainCategories = [
    { id: "overview", label: "Genel Bakış", icon: BarChart3 },
    { id: "tenants", label: "Acentalar", icon: Building2 },
    { id: "billing", label: "Üyelik & Faturalama", icon: CreditCard },
    { id: "users", label: "Kullanıcılar", icon: Users },
    { id: "system", label: "Sistem", icon: Server },
    { id: "communications", label: "İletişim", icon: MessageSquare },
    { id: "configuration", label: "Yapılandırma", icon: Settings2 },
  ];

  const subTabs: Record<string, { id: string; label: string; icon: React.ComponentType<{ className?: string }> }[]> = {
    overview: [
      { id: "analytics", label: "Analitik", icon: BarChart3 },
      { id: "revenue", label: "Gelir", icon: TrendingUp },
      { id: "api-status", label: "API İzleme", icon: Radio },
    ],
    tenants: [
      { id: "tenant-list", label: "Acenta Listesi", icon: Building2 },
      { id: "tenant-stats", label: "Acenta Istatistikleri", icon: BarChart3 },
    ],
    billing: [
      { id: "plans", label: "Planlar", icon: Package },
      { id: "features", label: "Özellikler", icon: Settings2 },
      { id: "subscriptions", label: "Abonelikler", icon: Users },
      { id: "payments", label: "Ödemeler", icon: CreditCard },
      { id: "invoices", label: "Faturalar", icon: Receipt },
    ],
    users: [
      { id: "users", label: "Kullanıcılar", icon: Users },
      { id: "roles", label: "Roller ve Izinler", icon: KeyRound },
      { id: "platform-admins", label: "Platform Yönetiçileri", icon: UserCog },
    ],
    system: [
      { id: "system", label: "Sistem Durumu", icon: Server },
      { id: "smtp", label: "SMTP Ayarları", icon: Mail },
      { id: "error-events", label: "Hata İzleme", icon: AlertTriangle },
      { id: "updates", label: "Güncellemeler", icon: RefreshCw },
      { id: "security", label: "Güvenlik", icon: Shield },
      { id: "bulk-ops", label: "Toplu İşlem", icon: Layers },
    ],
    communications: [
      { id: "announcements", label: "Duyurular", icon: Megaphone },
      { id: "support", label: "Destek Talepleri", icon: HeadphonesIcon },
    ],
    configuration: [
      { id: "branding", label: "Marka Ayarları", icon: Palette },
      { id: "popup-appearance", label: "Popup Görünümü", icon: Layers },
      { id: "websites", label: "Smartur Websiteleri", icon: Globe },
    ],
  };

  const handleCategoryChange = (categoryId: string) => {
    setActiveCategory(categoryId);
    const firstSubTab = subTabs[categoryId]?.[0]?.id;
    if (firstSubTab) {
      setActiveSubTab(firstSubTab);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <div className="w-56 border-r bg-muted/30 flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            Super Admin
          </h1>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {mainCategories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => handleCategoryChange(category.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-left",
                    activeCategory === category.id
                      ? "bg-primary text-primary-foreground"
                      : "hover-elevate"
                  )}
                  data-testid={`nav-category-${category.id}`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{category.label}</span>
                </button>
              );
            })}
          </div>
        </ScrollArea>
        <div className="p-2 border-t">
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleLogout} data-testid="button-super-admin-logout">
            <X className="h-4 w-4 mr-2" />
            Çıkış
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b bg-background">
          <div className="flex items-center gap-1 p-2 overflow-x-auto">
            {subTabs[activeCategory]?.map((tab) => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.id}
                  variant={activeSubTab === tab.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveSubTab(tab.id)}
                  data-testid={`tab-${tab.id}`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </Button>
              );
            })}
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-4">
            {activeSubTab === "analytics" && <AnalyticsSection />}
            {activeSubTab === "revenue" && <RevenueSection />}
            {activeSubTab === "api-status" && <ApiMonitoringSection />}

            {activeSubTab === "tenant-list" && <TenantManagementSection />}
            {activeSubTab === "tenant-stats" && <TenantStatsSection />}

            {activeSubTab === "plans" && (
              <div className="space-y-4">
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
                            En Populer
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
                              {formatPrice(plan.yearlyPriceTl)} TL
                              <span className="text-sm font-normal text-muted-foreground">/yıl</span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              ${formatPrice(plan.yearlyPriceUsd)}/yıl
                            </div>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Activity className="h-4 w-4 text-muted-foreground" />
                              <span>{plan.maxActivities === 9999 ? "Sınırsız" : plan.maxActivities} aktivite</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>{plan.maxUsers === 99 ? "Sınırsız" : plan.maxUsers} kullanıcı</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MessageSquare className="h-4 w-4 text-muted-foreground" />
                              <span>{plan.maxDailyMessages === 99999 ? "Sınırsız" : plan.maxDailyMessages} mesaj/gün</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CalendarDays className="h-4 w-4 text-muted-foreground" />
                              <span>{(plan as any).maxDailyReservations === 9999 ? "Sınırsız" : (plan as any).maxDailyReservations || 10} rez./gün</span>
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
              </div>
            )}

            {activeSubTab === "features" && <PlanFeaturesSection />}

            {activeSubTab === "subscriptions" && (
              <Card>
                <CardHeader>
                  <CardTitle>Aktif Abonelikler</CardTitle>
                  <CardDescription>Sistemdeki tum acenta abonelikleri</CardDescription>
                </CardHeader>
                <CardContent>
                  {subscriptionsData.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Henuz abonelik bulunmuyor.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead>Durum</TableHead>
                          <TableHead>Donem</TableHead>
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
                            <TableCell>{sub.billingCycle === "yearly" ? "Yıllik" : "Aylık"}</TableCell>
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
            )}

            {activeSubTab === "payments" && (
              <Card>
                <CardHeader>
                  <CardTitle>Ödeme Geçmişi</CardTitle>
                  <CardDescription>Tum abonelik ödemeleri</CardDescription>
                </CardHeader>
                <CardContent>
                  {paymentsData.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Henuz ödeme bulunmuyor.
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
            )}

            {activeSubTab === "invoices" && <InvoicesSection />}

            {activeSubTab === "users" && <UserManagementSection />}
            {activeSubTab === "roles" && <RolesPermissionsSection />}
            {activeSubTab === "platform-admins" && <PlatformAdminsSection />}

            {activeSubTab === "system" && <SystemMonitoringSection />}
            {activeSubTab === "smtp" && <SmtpConfigSection />}
            {activeSubTab === "error-events" && <ErrorEventsSection />}
            {activeSubTab === "updates" && <ApplicationUpdatesSection />}
            {activeSubTab === "security" && <SecuritySection />}
            {activeSubTab === "bulk-ops" && <BulkOperationsSection />}

            {activeSubTab === "announcements" && <AnnouncementsSection />}
            {activeSubTab === "support" && <AgencySupportSection />}

            {activeSubTab === "branding" && <BrandingSection />}
            {activeSubTab === "popup-appearance" && <PopupAppearanceSection />}
            {activeSubTab === "websites" && <SmartutWebsitesSection />}
          </div>
        </ScrollArea>
      </div>

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
                  placeholder="starter"
                  data-testid="input-plan-code"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Plan Adı</Label>
                <Input
                  id="name"
                  value={planForm.name || ""}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  placeholder="Starter"
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
                <Label htmlFor="yearlyPriceTl">Yıllık Fiyat (TL kuruş)</Label>
                <Input
                  id="yearlyPriceTl"
                  type="number"
                  value={planForm.yearlyPriceTl || 0}
                  onChange={(e) => setPlanForm({ ...planForm, yearlyPriceTl: Number(e.target.value) })}
                  data-testid="input-plan-yearly-price-tl"
                />
                <p className="text-xs text-muted-foreground">= {formatPrice(planForm.yearlyPriceTl)} TL/yıl</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="yearlyPriceUsd">Yıllık Fiyat (USD cent)</Label>
                <Input
                  id="yearlyPriceUsd"
                  type="number"
                  value={planForm.yearlyPriceUsd || 0}
                  onChange={(e) => setPlanForm({ ...planForm, yearlyPriceUsd: Number(e.target.value) })}
                  data-testid="input-plan-yearly-price-usd"
                />
                <p className="text-xs text-muted-foreground">= ${formatPrice(planForm.yearlyPriceUsd)}/yıl</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxActivities">Aktivite Sayısı</Label>
                <Input
                  id="maxActivities"
                  type="number"
                  value={planForm.maxActivities || 0}
                  onChange={(e) => setPlanForm({ ...planForm, maxActivities: Number(e.target.value) })}
                  data-testid="input-plan-max-activities"
                />
                <p className="text-xs text-muted-foreground">Oluşturulabilecek aktivite sayısı</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxUsers">Kullanıcı Sayısı</Label>
                <Input
                  id="maxUsers"
                  type="number"
                  value={planForm.maxUsers || 0}
                  onChange={(e) => setPlanForm({ ...planForm, maxUsers: Number(e.target.value) })}
                  data-testid="input-plan-max-users"
                />
                <p className="text-xs text-muted-foreground">Eklenebilecek kullanıcı sayısı</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxDailyMessages">Günlük Mesaj Limiti</Label>
                <Input
                  id="maxDailyMessages"
                  type="number"
                  value={planForm.maxDailyMessages || 0}
                  onChange={(e) => setPlanForm({ ...planForm, maxDailyMessages: Number(e.target.value) })}
                  data-testid="input-plan-max-daily-messages"
                />
                <p className="text-xs text-muted-foreground">Günlük WhatsApp mesaj sayısı</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxDailyReservations">Günlük Rezervasyon Limiti</Label>
                <Input
                  id="maxDailyReservations"
                  type="number"
                  value={planForm.maxDailyReservations || 0}
                  onChange={(e) => setPlanForm({ ...planForm, maxDailyReservations: Number(e.target.value) })}
                  data-testid="input-plan-max-daily-reservations"
                />
                <p className="text-xs text-muted-foreground">Günlük oluşturulabilecek rezervasyon</p>
              </div>
            </div>

            <div className="p-3 bg-muted/50 rounded-md">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
                <span>WhatsApp: Tüm paketlerde 1 numara (sabit)</span>
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md space-y-3" data-testid="cost-estimation-panel">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300">
                <DollarSign className="h-4 w-4" />
                <span>Tahmini AI Maliyet Hesaplayıcı (GPT-4o)</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Mesaj başına maliyet:</p>
                  <p className="font-medium" data-testid="text-cost-per-message">~$0.003 (500 input + 150 output token)</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Aylık mesaj (30 gün):</p>
                  <p className="font-medium" data-testid="text-monthly-message-count">{((planForm.maxDailyMessages || 0) * 30).toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Aylık AI maliyeti:</p>
                  <p className="font-medium text-orange-600 dark:text-orange-400" data-testid="text-monthly-cost-usd">
                    ~${((planForm.maxDailyMessages || 0) * 30 * 0.003).toFixed(2)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">TL karşılığı (1$=35TL):</p>
                  <p className="font-medium text-orange-600 dark:text-orange-400" data-testid="text-monthly-cost-tl">
                    ~{((planForm.maxDailyMessages || 0) * 30 * 0.003 * 35).toFixed(0)} TL
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Not: SSS eşleştirmesi AI çağrısı yapmaz (ücretsiz). Gerçek maliyet kullanım oranına bağlıdır.
              </p>
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
