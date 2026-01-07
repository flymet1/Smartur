import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Smartphone, QrCode, CheckCircle, Circle, RefreshCw, MessageSquare, Wifi, WifiOff, Plus, Trash2, Ban, Upload, Image, X, Shield, Eye, EyeOff, ExternalLink, Mail, AlertCircle, Download, Server, GitBranch, Clock, Terminal, Key, CalendarHeart, Edit2, CreditCard, AlertTriangle, Loader2, XCircle, Crown, Users, UserPlus, Pencil, Info, Save } from "lucide-react";
import { Link, useLocation } from "wouter";
import type { Holiday } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function Settings() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [reminderHours, setReminderHours] = useState(24);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  
  // Account password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [reminderMessage, setReminderMessage] = useState(
    "Merhaba {isim}! Rezervasyonunuz için hatırlatma:\n\n{aktiviteler}\nTarih: {tarih}\n\nSizi görmek için sabırsızlanıyoruz!"
  );
  const [botEnabled, setBotEnabled] = useState(true);
  const [botPrompt, setBotPrompt] = useState(
    "Sen bir TURİZM RESERVASYONLARI DANIŞMANI'sın. Müşterilerle Türkçe konuşarak rezervasyon yardımcılığı yap. Kibar, samimi ve profesyonel ol. Müşterinin sorularına hızla cevap ver ve rezervasyon yapmalarına yardımcı ol."
  );
  const [botRules, setBotRules] = useState("");
  const [botRulesLoaded, setBotRulesLoaded] = useState(false);
  const [customerSupportEmail, setCustomerSupportEmail] = useState("");
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [isRefreshingQR, setIsRefreshingQR] = useState(false);
  const [newBlacklistPhone, setNewBlacklistPhone] = useState("");
  const [newBlacklistReason, setNewBlacklistReason] = useState("");
    
  // Bot Access Settings
  const [botAccessActivities, setBotAccessActivities] = useState(true);
  const [botAccessPackageTours, setBotAccessPackageTours] = useState(true);
  const [botAccessCapacity, setBotAccessCapacity] = useState(true);
  const [botAccessFaq, setBotAccessFaq] = useState(true);
  const [botAccessConfirmation, setBotAccessConfirmation] = useState(true);
  const [botAccessTransfer, setBotAccessTransfer] = useState(true);
  const [botAccessExtras, setBotAccessExtras] = useState(true);
  const [botAccessSettingsLoaded, setBotAccessSettingsLoaded] = useState(false);
  
  // Gmail Settings (legacy - kept for data migration)
  const [gmailUser, setGmailUser] = useState("");
  const [gmailPassword, setGmailPassword] = useState("");
  const [showGmailPassword, setShowGmailPassword] = useState(false);
  const [isTestingGmail, setIsTestingGmail] = useState(false);
  const [isSavingGmail, setIsSavingGmail] = useState(false);
  
  // Notification Email Settings
  const [notificationEmail, setNotificationEmail] = useState("");
  const [isSavingNotificationEmail, setIsSavingNotificationEmail] = useState(false);
  
  // Bulk WhatsApp Message Templates (by status) - with labels and content
  const [bulkTemplateConfirmed, setBulkTemplateConfirmed] = useState(
    "Merhaba {isim},\n\nRezervasyon onaylandı!\nAktivite: {aktivite}\nTarih: {tarih}\nSaat: {saat}\n\nİyi günler dileriz."
  );
  const [bulkTemplatePending, setBulkTemplatePending] = useState(
    "Merhaba {isim},\n\nRezervasyon talebiniz değerlendiriliyor.\nAktivite: {aktivite}\nTarih: {tarih}\nSaat: {saat}\n\nEn kısa sürede bilgilendirme yapılacaktır."
  );
  const [bulkTemplateCancelled, setBulkTemplateCancelled] = useState(
    "Merhaba {isim},\n\nÜzgünüz, rezervasyonunuz iptal edilmiştir.\nAktivite: {aktivite}\nTarih: {tarih}\n\nDetaylar için: {takip_linki}\n\nSorularınız için bizimle iletişime geçebilirsiniz."
  );
  const [bulkLabelConfirmed, setBulkLabelConfirmed] = useState("Onaylandı");
  const [bulkLabelPending, setBulkLabelPending] = useState("Beklemede");
  const [bulkLabelCancelled, setBulkLabelCancelled] = useState("İptal");
  const [bulkTemplatesLoaded, setBulkTemplatesLoaded] = useState(false);

  
  // Load bot access settings
  const { data: botAccessSettings } = useQuery<{ key: string; value: string | null }>({
    queryKey: ['/api/settings', 'botAccess'],
    queryFn: async () => {
      const res = await fetch('/api/settings/botAccess');
      return res.json();
    },
  });


  // Load bot prompt
  const { data: botPromptSetting } = useQuery<{ key: string; value: string | null }>({
    queryKey: ['/api/settings', 'botPrompt'],
    queryFn: async () => {
      const res = await fetch('/api/settings/botPrompt');
      return res.json();
    },
  });

  // Load bot rules
  const { data: botRulesSetting } = useQuery<{ key: string; value: string | null }>({
    queryKey: ['/api/settings', 'bot_rules'],
    queryFn: async () => {
      const res = await fetch('/api/settings/bot_rules');
      return res.json();
    },
  });

  // State to track if bot prompt has been loaded
  const [botPromptLoaded, setBotPromptLoaded] = useState(false);

  // Load bulk message templates
  const { data: bulkTemplatesSetting } = useQuery<{ key: string; value: string | null }>({
    queryKey: ['/api/settings', 'bulkMessageTemplates'],
    queryFn: async () => {
      const res = await fetch('/api/settings/bulkMessageTemplates');
      return res.json();
    },
  });

  // Load Tenant Integrations (Twilio, WooCommerce, Gmail)
  const { data: tenantIntegrations, refetch: refetchTenantIntegrations } = useQuery<{
    twilioAccountSid: string;
    twilioWhatsappNumber: string;
    twilioConfigured: boolean;
    twilioWebhookUrl: string;
    woocommerceStoreUrl: string;
    woocommerceConsumerKey: string;
    woocommerceConfigured: boolean;
    gmailUser: string;
    gmailFromName: string;
    gmailConfigured: boolean;
  }>({
    queryKey: ['/api/tenant-integrations'],
    queryFn: async () => {
      const res = await fetch('/api/tenant-integrations');
      if (!res.ok) {
        return {
          twilioAccountSid: '', twilioWhatsappNumber: '', twilioConfigured: false, twilioWebhookUrl: '',
          woocommerceStoreUrl: '', woocommerceConsumerKey: '', woocommerceConfigured: false,
          gmailUser: '', gmailFromName: '', gmailConfigured: false,
        };
      }
      return res.json();
    },
  });

  // Apply loaded Gmail settings from tenant integrations
  useEffect(() => {
    if (tenantIntegrations?.gmailUser) {
      setGmailUser(tenantIntegrations.gmailUser);
    }
  }, [tenantIntegrations?.gmailUser]);

  // Apply loaded bot access settings when data arrives (using useEffect)
  useEffect(() => {
    if (botAccessSettings?.value && !botAccessSettingsLoaded) {
      try {
        const settings = JSON.parse(botAccessSettings.value);
        if (settings.enabled !== undefined) setBotEnabled(settings.enabled);
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


  // Apply loaded bot prompt when data arrives
  useEffect(() => {
    if (botPromptSetting?.value && !botPromptLoaded) {
      setBotPrompt(botPromptSetting.value);
      setBotPromptLoaded(true);
    }
  }, [botPromptSetting?.value, botPromptLoaded]);

  // Apply loaded bot rules when data arrives
  useEffect(() => {
    if (botRulesSetting?.value && !botRulesLoaded) {
      setBotRules(botRulesSetting.value);
      setBotRulesLoaded(true);
    }
  }, [botRulesSetting?.value, botRulesLoaded]);

  // Apply loaded bulk message templates when data arrives (with backwards compatibility)
  useEffect(() => {
    if (bulkTemplatesSetting?.value && !bulkTemplatesLoaded) {
      try {
        const templates = JSON.parse(bulkTemplatesSetting.value);
        // Support both old format (string) and new format ({ label, content })
        if (templates.confirmed) {
          if (typeof templates.confirmed === 'string') {
            setBulkTemplateConfirmed(templates.confirmed);
          } else {
            if (templates.confirmed.content) setBulkTemplateConfirmed(templates.confirmed.content);
            if (templates.confirmed.label) setBulkLabelConfirmed(templates.confirmed.label);
          }
        }
        if (templates.pending) {
          if (typeof templates.pending === 'string') {
            setBulkTemplatePending(templates.pending);
          } else {
            if (templates.pending.content) setBulkTemplatePending(templates.pending.content);
            if (templates.pending.label) setBulkLabelPending(templates.pending.label);
          }
        }
        if (templates.cancelled) {
          if (typeof templates.cancelled === 'string') {
            setBulkTemplateCancelled(templates.cancelled);
          } else {
            if (templates.cancelled.content) setBulkTemplateCancelled(templates.cancelled.content);
            if (templates.cancelled.label) setBulkLabelCancelled(templates.cancelled.label);
          }
        }
        setBulkTemplatesLoaded(true);
      } catch {}
    }
  }, [bulkTemplatesSetting?.value, bulkTemplatesLoaded]);

  
  const handleSaveGmailSettings = async () => {
    if (!gmailUser || !gmailPassword) {
      toast({ title: "Hata", description: "Gmail adresi ve uygulama şifresi gerekli.", variant: "destructive" });
      return;
    }
    
    setIsSavingGmail(true);
    try {
      const res = await fetch('/api/tenant-integrations/gmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gmailUser, gmailPassword, gmailFromName: gmailUser })
      });
      const data = await res.json();
      
      if (res.ok) {
        toast({ title: "Başarılı", description: data.message || "Gmail ayarları kaydedildi." });
        setGmailPassword("");
        await refetchTenantIntegrations();
      } else {
        toast({ title: "Hata", description: data.error || "Gmail ayarları kaydedilemedi.", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Hata", description: "Gmail ayarları kaydedilemedi.", variant: "destructive" });
    } finally {
      setIsSavingGmail(false);
    }
  };

  const handleTestGmailConnection = async () => {
    setIsTestingGmail(true);
    try {
      const res = await fetch('/api/tenant-integrations/gmail/test', { method: 'POST' });
      const data = await res.json();
      
      if (data.success) {
        toast({ title: "Başarılı", description: data.message || "Gmail baglantisi başarılı!" });
      } else {
        toast({ title: "Hata", description: data.error || "Gmail baglantisi başarısız.", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Hata", description: "Gmail baglantisi test edilemedi.", variant: "destructive" });
    } finally {
      setIsTestingGmail(false);
    }
  };

  const handleDisconnectGmail = async () => {
    try {
      const res = await fetch('/api/tenant-integrations/gmail', { method: 'DELETE' });
      if (res.ok) {
        toast({ title: "Başarılı", description: "Gmail baglantisi kaldırıldı." });
        setGmailUser("");
        setGmailPassword("");
        await refetchTenantIntegrations();
      }
    } catch (err) {
      toast({ title: "Hata", description: "Gmail baglantisi kaldırilamadi.", variant: "destructive" });
    }
  };
  
  // Load notification email setting from tenant settings
  const { data: notificationEmailSetting } = useQuery<{ value: string | null }>({
    queryKey: ['/api/settings', 'tenantNotificationEmail'],
    queryFn: async () => {
      const res = await fetch('/api/settings/tenantNotificationEmail');
      return res.json();
    },
  });
  
  useEffect(() => {
    if (notificationEmailSetting?.value) {
      setNotificationEmail(notificationEmailSetting.value);
    }
  }, [notificationEmailSetting?.value]);
  
  const handleSaveNotificationEmail = async () => {
    setIsSavingNotificationEmail(true);
    try {
      await apiRequest('POST', '/api/settings/tenantNotificationEmail', { value: notificationEmail });
      toast({ title: "Başarılı", description: "Bildirim e-postası kaydedildi." });
      queryClient.invalidateQueries({ queryKey: ['/api/settings', 'tenantNotificationEmail'] });
    } catch (err) {
      toast({ title: "Hata", description: "E-posta kaydedilemedi.", variant: "destructive" });
    } finally {
      setIsSavingNotificationEmail(false);
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
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
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
        enabled: botEnabled,
        activities: botAccessActivities,
        packageTours: botAccessPackageTours,
        capacity: botAccessCapacity,
        faq: botAccessFaq,
        confirmation: botAccessConfirmation,
        transfer: botAccessTransfer,
        extras: botAccessExtras
      });

      // Save all settings
      const savePromises = [
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
        fetch("/api/settings/bot_rules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: botRules })
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
        }),
        fetch("/api/settings/bulkMessageTemplates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: JSON.stringify({
            confirmed: { label: bulkLabelConfirmed, content: bulkTemplateConfirmed },
            pending: { label: bulkLabelPending, content: bulkTemplatePending },
            cancelled: { label: bulkLabelCancelled, content: bulkTemplateCancelled }
          }) })
        })
      ];

      await Promise.all(savePromises);
      
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

  // Handle password change
  const handleChangePassword = async () => {
    if (!currentPassword) {
      setPasswordError("Mevcut şifrenizi girmelisiniz.");
      return;
    }
    if (!newPassword) {
      setPasswordError("Yeni şifrenizi girmelisiniz.");
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setPasswordError("Yeni şifreler eşleşmiyor.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Yeni şifre en az 6 karakter olmalıdır.");
      return;
    }

    setIsChangingPassword(true);
    setPasswordError("");

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          currentPassword, 
          newPassword 
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setPasswordError(data.error || "Şifre değiştirilemedi.");
        toast({ 
          title: "Hata", 
          description: data.error || "Şifre değiştirilemedi.", 
          variant: "destructive" 
        });
        return;
      }

      // Clear fields on success
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
      setPasswordError("");

      toast({ 
        title: "Başarılı", 
        description: "Şifreniz başarıyla değiştirildi."
      });
    } catch (err) {
      setPasswordError("Şifre değiştirme işlemi başarısız.");
      toast({ 
        title: "Hata", 
        description: "Şifre değiştirilemedi.", 
        variant: "destructive" 
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Get current location from wouter
  const [location] = useLocation();

  // Settings tab state - read from URL query parameter if present
  const [settingsTab, setSettingsTab] = useState('security');

  // Update tab when URL changes (e.g., clicking sidebar links)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && ['security', 'whatsapp', 'integrations', 'holidays', 'system', 'users', 'data'].includes(tab)) {
      setSettingsTab(tab);
    }
  }, [location]);

  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold font-display">Ayarlar</h1>
          <p className="text-muted-foreground mt-1">Sistem yapılandırması</p>
        </div>

        {/* Settings Navigation Tabs */}
        <Tabs value={settingsTab} onValueChange={setSettingsTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 mb-6">
            <TabsTrigger value="security" data-testid="tab-security">
              <Shield className="w-4 h-4 mr-2 hidden sm:inline" />
              Güvenlik
            </TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">
              <Users className="w-4 h-4 mr-2 hidden sm:inline" />
              Kullanıcılar
            </TabsTrigger>
            <TabsTrigger value="whatsapp" data-testid="tab-whatsapp">
              <MessageSquare className="w-4 h-4 mr-2 hidden sm:inline" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="integrations" data-testid="tab-integrations">
              <ExternalLink className="w-4 h-4 mr-2 hidden sm:inline" />
              Entegrasyonlar
            </TabsTrigger>
            <TabsTrigger value="holidays" data-testid="tab-holidays">
              <CalendarHeart className="w-4 h-4 mr-2 hidden sm:inline" />
              Tatiller
            </TabsTrigger>
            <TabsTrigger value="data" data-testid="tab-data">
              <Download className="w-4 h-4 mr-2 hidden sm:inline" />
              Veri
            </TabsTrigger>
          </TabsList>

          {/* SECURITY TAB */}
          <TabsContent value="security" className="space-y-6">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                Hesap Ayarları
              </CardTitle>
              <CardDescription>
                Hesabıniza ait şifrenizi değiştirebilirsiniz
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Mevcut Şifre</Label>
                  <div className="relative">
                    <Input 
                      id="currentPassword"
                      type={showPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => {
                        setCurrentPassword(e.target.value);
                        setPasswordError("");
                      }}
                      placeholder="Mevcut şifrenizi girin"
                      data-testid="input-current-password"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Yeni Şifre</Label>
                    <div className="relative">
                      <Input 
                        id="newPassword"
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          setPasswordError("");
                        }}
                        placeholder="Yeni şifrenizi girin"
                        data-testid="input-new-password"
                      />
                      <Tooltip>
                        <TooltipTrigger asChild>
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
                        </TooltipTrigger>
                        <TooltipContent>{showPassword ? "Şifreyi gizle" : "Şifreyi göster"}</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPasswordConfirm">Yeni Şifre Tekrar</Label>
                    <Input 
                      id="newPasswordConfirm"
                      type={showPassword ? "text" : "password"}
                      value={newPasswordConfirm}
                      onChange={(e) => {
                        setNewPasswordConfirm(e.target.value);
                        setPasswordError("");
                      }}
                      placeholder="Yeni şifreyi tekrar girin"
                      data-testid="input-new-password-confirm"
                    />
                  </div>
                </div>

                {passwordError && (
                  <p className="text-sm text-destructive mt-2">{passwordError}</p>
                )}

                <Button 
                  onClick={handleChangePassword}
                  disabled={isChangingPassword || !currentPassword || !newPassword || !newPasswordConfirm}
                  data-testid="button-change-password"
                >
                  {isChangingPassword ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Değiştiriliyor...
                    </>
                  ) : (
                    <>
                      <Key className="h-4 w-4 mr-2" />
                      Şifreyi Değiştir
                    </>
                  )}
                </Button>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Şifrenizi değiştirdikten sonra yeni şifrenizle giriş yapmaniz gerekecektir.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                E-posta Bildirimleri
              </CardTitle>
              <CardDescription>
                Destek talepleri ve sistem bildirimleri için e-posta adresinizi ayarlayın
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-800 dark:text-blue-300">Merkezi E-posta Sistemi</p>
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                      E-postalar platform tarafından merkezi olarak gönderilmektedir. Sadece bildirim alacağınız e-posta adresini belirtin.
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notificationEmail">Bildirim E-posta Adresi</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      id="notificationEmail"
                      type="email"
                      value={notificationEmail}
                      onChange={(e) => setNotificationEmail(e.target.value)}
                      placeholder="bildirim@acenteniz.com"
                      className="max-w-md"
                      data-testid="input-notification-email"
                    />
                    <Button
                      onClick={handleSaveNotificationEmail}
                      disabled={isSavingNotificationEmail}
                      data-testid="button-save-notification-email"
                    >
                      {isSavingNotificationEmail ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Kaydet
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Bu adrese müşteri talepleri, rezervasyon bildirimleri ve sistem uyarıları gönderilir.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

                    </TabsContent>

          {/* WHATSAPP TAB */}
          <TabsContent value="whatsapp" className="space-y-6">
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
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="connection" data-testid="tab-whatsapp-connection">
                    <Smartphone className="w-4 h-4 mr-2" />
                    Baglanti
                  </TabsTrigger>
                  <TabsTrigger value="bot" data-testid="tab-whatsapp-bot">Bot Ayarları</TabsTrigger>
                  <TabsTrigger value="templates" data-testid="tab-whatsapp-templates">Sablonlar</TabsTrigger>
                  <TabsTrigger value="bot-test" data-testid="tab-whatsapp-bot-test">Bot Test</TabsTrigger>
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
                          <Tooltip>
                            <TooltipTrigger asChild>
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
                            </TooltipTrigger>
                            <TooltipContent>QR kodu yenile</TooltipContent>
                          </Tooltip>
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
                            <strong>Ipucu:</strong> Prompt'unuzda müşterilerle samimi olmalarini, kibar olmalarini, hızlı cevap vermelerini ve rezervasyon yapmalarina yardimci olmalarini belirtin.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4 bg-muted/50 p-4 rounded-lg border border-muted">
                        <div className="space-y-2">
                          <Label htmlFor="botRules" className="text-base font-medium">Bot Kuralları (13 Madde)</Label>
                          <p className="text-sm text-muted-foreground">
                            Bot bu kurallara uyarak müşterilerle iletişim kuracak. Her satır ayrı bir kural olarak değerlendirilir.
                          </p>
                          <Textarea 
                            id="botRules"
                            value={botRules}
                            onChange={(e) => setBotRules(e.target.value)}
                            placeholder="1. Müşterilere her zaman nazik ve profesyonel ol&#10;2. Fiyat bilgisi verirken net rakamlar kullan&#10;3. Rezervasyon detaylarını mutlaka teyit et&#10;..."
                            className="min-h-[250px] font-mono text-sm"
                            data-testid="textarea-bot-rules"
                          />
                          <p className="text-xs text-muted-foreground">
                            Her kuralı yeni satırda yazın. Bot bu kurallara sıkı sıkıya uyacak şekilde yapılandırılmıştır.
                          </p>
                        </div>

                        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                          <p className="text-xs text-amber-900 dark:text-amber-200">
                            <strong>Önemli:</strong> Bu kurallar bot'un davranışını doğrudan etkiler. Yaptığınız değişiklikler kaydedildikten sonra bot yeni kurallara göre çalışmaya başlar.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4 bg-muted/50 p-4 rounded-lg border border-muted">
                        <div className="space-y-1">
                          <Label className="text-base font-medium">Bot Erişim Ayarları</Label>
                          <p className="text-sm text-muted-foreground">
                            Bot'un hangi bilgilere erişebileceğini seçin. Kapatılan bilgiler bot'a gönderilmez.
                          </p>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-4 py-2 border-b border-muted">
                            <div className="space-y-0.5">
                              <Label>Aktivite Bilgileri</Label>
                              <p className="text-xs text-muted-foreground">Aktivite açıklamalari, fiyatlar ve rezervasyon linkleri</p>
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
                              <p className="text-xs text-muted-foreground">Paket tur açıklamalari, fiyatlar ve rezervasyon linkleri</p>
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
                              <p className="text-xs text-muted-foreground">Müsaitlik ve kontenjan bilgileri</p>
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
                              <p className="text-xs text-muted-foreground">Aktivite ve paket turlar için tanımlı SSS'ler</p>
                            </div>
                            <Switch 
                              checked={botAccessFaq} 
                              onCheckedChange={setBotAccessFaq}
                              data-testid="switch-bot-access-faq"
                            />
                          </div>

                          <div className="flex items-center justify-between gap-4 py-2 border-b border-muted">
                            <div className="space-y-0.5">
                              <Label>Onay Mesajları</Label>
                              <p className="text-xs text-muted-foreground">Sipariş tamamlandıginda gönderilecek onay mesajları</p>
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
                              <p className="text-xs text-muted-foreground">Ücretsiz otel transferi bolgeleri</p>
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
                            Kara listedeki numaralardan gelen mesajlar kaydedilir ancak bot otomatik yanıt vermez.
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

                <TabsContent value="templates" className="space-y-6 mt-4">
                  <RequestMessageTemplatesSection />
                  
                  <div className="border-t pt-6">
                    <div className="space-y-4">
                      <div className="space-y-0.5">
                        <h4 className="font-medium">Toplu Bildirim Mesaj Şablonları</h4>
                        <p className="text-sm text-muted-foreground">Rezervasyon durumuna göre farklı mesaj şablonları tanımlayın</p>
                      </div>
                      
                      <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-2">
                        <p className="font-medium">Kullanılabilir Değişkenler:</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div><code className="bg-background px-1.5 py-1 rounded">{'{'}isim{'}'}</code> - Müşteri adı</div>
                          <div><code className="bg-background px-1.5 py-1 rounded">{'{'}tarih{'}'}</code> - Rezervasyon tarihi</div>
                          <div><code className="bg-background px-1.5 py-1 rounded">{'{'}aktivite{'}'}</code> - Aktivite adı</div>
                          <div><code className="bg-background px-1.5 py-1 rounded">{'{'}saat{'}'}</code> - Rezervasyon saati</div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <Card className="p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">confirmed</Badge>
                            <Input
                              value={bulkLabelConfirmed}
                              onChange={(e) => setBulkLabelConfirmed(e.target.value)}
                              className="h-7 w-32 text-sm font-medium"
                              placeholder="Şablon adı"
                              data-testid="input-bulk-label-confirmed"
                            />
                            <span className="text-sm text-muted-foreground">Onaylanan rezervasyonlar için</span>
                          </div>
                          <Textarea 
                            value={bulkTemplateConfirmed}
                            onChange={(e) => setBulkTemplateConfirmed(e.target.value)}
                            placeholder="Onay mesajı şablonu..."
                            className="min-h-[100px]"
                            data-testid="input-bulk-template-confirmed"
                          />
                        </Card>

                        <Card className="p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">pending</Badge>
                            <Input
                              value={bulkLabelPending}
                              onChange={(e) => setBulkLabelPending(e.target.value)}
                              className="h-7 w-32 text-sm font-medium"
                              placeholder="Şablon adı"
                              data-testid="input-bulk-label-pending"
                            />
                            <span className="text-sm text-muted-foreground">Değerlendirilen rezervasyonlar için</span>
                          </div>
                          <Textarea 
                            value={bulkTemplatePending}
                            onChange={(e) => setBulkTemplatePending(e.target.value)}
                            placeholder="Beklemede mesajı şablonu..."
                            className="min-h-[100px]"
                            data-testid="input-bulk-template-pending"
                          />
                        </Card>

                        <Card className="p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">cancelled</Badge>
                            <Input
                              value={bulkLabelCancelled}
                              onChange={(e) => setBulkLabelCancelled(e.target.value)}
                              className="h-7 w-32 text-sm font-medium"
                              placeholder="Şablon adı"
                              data-testid="input-bulk-label-cancelled"
                            />
                            <span className="text-sm text-muted-foreground">İptal edilen rezervasyonlar için</span>
                          </div>
                          <Textarea 
                            value={bulkTemplateCancelled}
                            onChange={(e) => setBulkTemplateCancelled(e.target.value)}
                            placeholder="İptal mesajı şablonu..."
                            className="min-h-[100px]"
                            data-testid="input-bulk-template-cancelled"
                          />
                        </Card>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Tek rezervasyon seçildiğinde değişkenler otomatik doldurulur. Birden fazla seçildiğinde genel mesaj kullanılır.
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="bot-test" className="space-y-6 mt-4">
                  <BotTestSection />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          </TabsContent>

          {/* INTEGRATIONS TAB */}
          <TabsContent value="integrations" className="space-y-6">
          <WooCommerceCard />

          <AutoResponsesCard />
          </TabsContent>

          {/* USERS TAB */}
          <TabsContent value="users" className="space-y-6">
            <UserManagementSection />
          </TabsContent>

          {/* HOLIDAYS TAB */}
          <TabsContent value="holidays" className="space-y-6">
            <HolidaysSection />
          </TabsContent>

          {/* DATA EXPORT TAB */}
          <TabsContent value="data" className="space-y-6">
            <DataExportSection />
          </TabsContent>
        </Tabs>

        {/* Save Button at the end of content */}
        <div className="mt-8 pt-6 border-t">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground hidden sm:block">
              Değişikliklerinizi kaydetmeyi unutmayın
            </p>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={handleSaveSettings} 
                  disabled={isSaving}
                  size="lg"
                  className="shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all ml-auto"
                  data-testid="button-save-all"
                >
                  {isSaving ? "Kaydediliyor..." : "Tüm Ayarları Kaydet"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Tüm ayarları kaydet</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </main>
    </div>
  );
}

// WooCommerce Card Component
function WooCommerceCard() {
  const { toast } = useToast();
  const [storeUrl, setStoreUrl] = useState("");
  const [consumerKey, setConsumerKey] = useState("");
  const [consumerSecret, setConsumerSecret] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const { data: wooSettings, isLoading, refetch } = useQuery<{
    woocommerceStoreUrl: string;
    woocommerceConsumerKey: string;
    woocommerceConfigured: boolean;
  }>({
    queryKey: ['/api/tenant-integrations'],
    queryFn: async () => {
      const res = await fetch('/api/tenant-integrations');
      if (!res.ok) return { woocommerceStoreUrl: '', woocommerceConsumerKey: '', woocommerceConfigured: false };
      return res.json();
    },
  });

  const webhookUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/webhooks/woocommerce`
    : '/api/webhooks/woocommerce';

  const handleConnect = async () => {
    if (!storeUrl || !consumerKey || !consumerSecret) {
      toast({
        title: "Hata",
        description: "Tum alanlari doldurun",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    try {
      const response = await fetch('/api/tenant-integrations/woocommerce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeUrl, consumerKey, consumerSecret }),
      });

      if (response.ok) {
        toast({
          title: "Başarılı",
          description: "WooCommerce baglantisi kuruldu",
        });
        setStoreUrl("");
        setConsumerKey("");
        setConsumerSecret("");
        refetch();
      } else {
        const data = await response.json();
        toast({
          title: "Hata",
          description: data.error || "Baglanti kurulamadi",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Hata",
        description: "Baglanti hatası",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      const response = await fetch('/api/tenant-integrations/woocommerce', {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: "Başarılı",
          description: "WooCommerce baglantisi kaldırıldı",
        });
        refetch();
      }
    } catch (error) {
      toast({
        title: "Hata",
        description: "Baglanti kaldırilamadi",
        variant: "destructive",
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast({
      title: "Kopyalandı",
      description: "Webhook URL panoya kopyalandı",
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>WooCommerce Entegrasyonu</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Yükleniyor...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span>WooCommerce Entegrasyonu</span>
          {wooSettings?.woocommerceConfigured ? (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 gap-1">
              <CheckCircle className="w-3 h-3" />
              Bağlı
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <XCircle className="w-3 h-3" />
              Bağlı Degil
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {wooSettings?.woocommerceConfigured ? (
          <>
            <div className="p-4 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <CheckCircle className="w-5 h-5" />
                <div>
                  <p className="font-medium">WooCommerce Baglantisi Aktif</p>
                  <p className="text-sm opacity-80">Magaza: {wooSettings.woocommerceStoreUrl}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <div className="flex gap-2">
                <Input readOnly value={webhookUrl} className="bg-muted" data-testid="input-webhook-url" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" onClick={copyToClipboard} data-testid="button-copy-webhook">
                      Kopyala
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Webhook URL'i panoya kopyala</TooltipContent>
                </Tooltip>
              </div>
              <p className="text-xs text-muted-foreground">
                Bu URL'i WooCommerce ayarlarıniza ekleyin (WooCommerce &gt; Settings &gt; Advanced &gt; Webhooks).
              </p>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="destructive" 
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  data-testid="button-disconnect-woo"
                >
                  {isDisconnecting ? "Kaldıriliyor..." : "Baglantiyi Kaldır"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>WooCommerce bağlantısını kaldır</TooltipContent>
            </Tooltip>
          </>
        ) : (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="woo-store-url">Magaza URL</Label>
                <Input
                  id="woo-store-url"
                  value={storeUrl}
                  onChange={(e) => setStoreUrl(e.target.value)}
                  placeholder="https://magazaniz.com"
                  data-testid="input-woo-store-url"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="woo-consumer-key">Consumer Key</Label>
                <Input
                  id="woo-consumer-key"
                  value={consumerKey}
                  onChange={(e) => setConsumerKey(e.target.value)}
                  placeholder="ck_xxxxxxxx"
                  data-testid="input-woo-consumer-key"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="woo-consumer-secret">Consumer Secret</Label>
                <Input
                  id="woo-consumer-secret"
                  type="password"
                  value={consumerSecret}
                  onChange={(e) => setConsumerSecret(e.target.value)}
                  placeholder="cs_xxxxxxxx"
                  data-testid="input-woo-consumer-secret"
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              WooCommerce &gt; Settings &gt; Advanced &gt; REST API bölümünden API anahtarlarınızı oluşturabilirsiniz.
            </p>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={handleConnect}
                  disabled={isConnecting}
                  data-testid="button-connect-woo"
                >
                  {isConnecting ? "Baglaniyor..." : "WooCommerce'e Baglan"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>WooCommerce mağazasına bağlan</TooltipContent>
            </Tooltip>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Auto Responses Card Component
type AutoResponse = {
  id: number;
  name: string;
  keywords: string;
  keywordsEn: string | null;
  response: string;
  responseEn: string | null;
  priority: number | null;
  isActive: boolean | null;
  createdAt: Date | null;
};

function AutoResponsesCard() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AutoResponse | null>(null);
  const [formName, setFormName] = useState("");
  const [formKeywords, setFormKeywords] = useState("");
  const [formKeywordsEn, setFormKeywordsEn] = useState("");
  const [formResponse, setFormResponse] = useState("");
  const [formResponseEn, setFormResponseEn] = useState("");
  const [formPriority, setFormPriority] = useState(0);
  const [formIsActive, setFormIsActive] = useState(true);
  const [activeTab, setActiveTab] = useState<'tr' | 'en'>('tr');

  const { data: autoResponses = [], isLoading } = useQuery<AutoResponse[]>({
    queryKey: ['/api/auto-responses']
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; keywords: string; keywordsEn: string; response: string; responseEn: string; priority: number; isActive: boolean }) => 
      apiRequest('POST', '/api/auto-responses', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auto-responses'] });
      resetForm();
      setDialogOpen(false);
      toast({ title: "Başarılı", description: "Otomatik yanıt eklendi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Otomatik yanıt eklenemedi.", variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { name: string; keywords: string; keywordsEn: string; response: string; responseEn: string; priority: number; isActive: boolean } }) => 
      apiRequest('PATCH', `/api/auto-responses/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auto-responses'] });
      resetForm();
      setDialogOpen(false);
      toast({ title: "Başarılı", description: "Otomatik yanıt güncellendi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Otomatik yanıt güncellenemedi.", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest('DELETE', `/api/auto-responses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auto-responses'] });
      toast({ title: "Başarılı", description: "Otomatik yanıt silindi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Otomatik yanıt silinemedi.", variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormName("");
    setFormKeywords("");
    setFormKeywordsEn("");
    setFormResponse("");
    setFormResponseEn("");
    setFormPriority(0);
    setFormIsActive(true);
    setEditingItem(null);
    setActiveTab('tr');
  };

  const handleOpenDialog = (item?: AutoResponse) => {
    if (item) {
      setEditingItem(item);
      setFormName(item.name);
      try {
        const keywords = JSON.parse(item.keywords);
        setFormKeywords(Array.isArray(keywords) ? keywords.join(", ") : "");
      } catch {
        setFormKeywords("");
      }
      try {
        const keywordsEn = JSON.parse(item.keywordsEn || '[]');
        setFormKeywordsEn(Array.isArray(keywordsEn) ? keywordsEn.join(", ") : "");
      } catch {
        setFormKeywordsEn("");
      }
      setFormResponse(item.response);
      setFormResponseEn(item.responseEn || "");
      setFormPriority(item.priority || 0);
      setFormIsActive(item.isActive !== false);
    } else {
      resetForm();
    }
    setActiveTab('tr');
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formName.trim() || !formKeywords.trim() || !formResponse.trim()) {
      toast({ title: "Hata", description: "Turkce alanlar zorunludur.", variant: "destructive" });
      return;
    }

    const keywordsArray = formKeywords.split(",").map(k => k.trim()).filter(k => k);
    if (keywordsArray.length === 0) {
      toast({ title: "Hata", description: "En az bir Turkce anahtar kelime girmelisiniz.", variant: "destructive" });
      return;
    }

    const keywordsEnArray = formKeywordsEn.split(",").map(k => k.trim()).filter(k => k);

    const data = {
      name: formName.trim(),
      keywords: JSON.stringify(keywordsArray),
      keywordsEn: JSON.stringify(keywordsEnArray),
      response: formResponse.trim(),
      responseEn: formResponseEn.trim(),
      priority: formPriority,
      isActive: formIsActive
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Bu otomatik yaniti silmek istediğinize emin misiniz?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Otomatik Yanitlar
        </CardTitle>
        <CardDescription>
          Anahtar kelime eşleşmesiyle hızlı yanıtlar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-end">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={() => handleOpenDialog()} data-testid="button-add-auto-response">
                <Plus className="w-4 h-4 mr-2" />
                Yeni Kural Ekle
              </Button>
            </TooltipTrigger>
            <TooltipContent>Yeni otomatik yanıt kuralı ekle</TooltipContent>
          </Tooltip>
        </div>

        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">Yükleniyor...</div>
        ) : autoResponses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
            Henüz otomatik yanıt kuralı eklenmemiş.
          </div>
        ) : (
          <div className="space-y-3">
            {autoResponses.map((item) => {
              let keywords: string[] = [];
              let keywordsEn: string[] = [];
              try {
                keywords = JSON.parse(item.keywords);
              } catch {}
              try {
                keywordsEn = JSON.parse(item.keywordsEn || '[]');
              } catch {}
              
              return (
                <div
                  key={item.id}
                  className={`p-4 border rounded-lg space-y-2 ${item.isActive === false ? 'opacity-50' : ''}`}
                  data-testid={`auto-response-item-${item.id}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{item.name}</span>
                      {item.isActive === false && (
                        <Badge variant="secondary">Pasif</Badge>
                      )}
                      <Badge variant="outline">Oncelik: {item.priority || 0}</Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(item)}
                            data-testid={`button-edit-${item.id}`}
                          >
                            <Shield className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Kuralı düzenle</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(item.id)}
                            data-testid={`button-delete-${item.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Kuralı sil</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap gap-1 items-center">
                      <span className="text-xs text-muted-foreground">TR:</span>
                      {keywords.map((kw, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {kw}
                        </Badge>
                      ))}
                    </div>
                    {keywordsEn.length > 0 && (
                      <div className="flex flex-wrap gap-1 items-center">
                        <span className="text-xs text-muted-foreground">EN:</span>
                        {keywordsEn.map((kw, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {kw}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{item.response}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Add/Edit Dialog */}
        {dialogOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDialogOpen(false)}>
            <div className="bg-background border rounded-lg p-6 max-w-lg w-full mx-4 space-y-4" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-semibold">
                {editingItem ? "Otomatik Yaniti Düzenle" : "Yeni Otomatik Yanit"}
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="auto-name">Kural Adı</Label>
                  <Input
                    id="auto-name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="orn: Fiyat Sorgusu"
                    data-testid="input-auto-name"
                  />
                </div>

                <div className="flex gap-1 border-b">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={`rounded-none border-b-2 ${activeTab === 'tr' ? 'border-primary' : 'border-transparent'}`}
                    onClick={() => setActiveTab('tr')}
                    data-testid="tab-tr"
                  >
                    Turkce
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={`rounded-none border-b-2 ${activeTab === 'en' ? 'border-primary' : 'border-transparent'}`}
                    onClick={() => setActiveTab('en')}
                    data-testid="tab-en"
                  >
                    English
                  </Button>
                </div>

                {activeTab === 'tr' ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="auto-keywords">Turkce Anahtar Kelimeler (virgul ile ayirin)</Label>
                      <Input
                        id="auto-keywords"
                        value={formKeywords}
                        onChange={(e) => setFormKeywords(e.target.value)}
                        placeholder="fiyat, ücret, ne kadar, kac para"
                        data-testid="input-auto-keywords"
                      />
                      <p className="text-xs text-muted-foreground">
                        Turkce karakter farki gözetilmez (i/ı, o/ö, u/ü, s/ş, c/ç, g/ğ)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="auto-response">Turkce Yanit</Label>
                      <Textarea
                        id="auto-response"
                        value={formResponse}
                        onChange={(e) => setFormResponse(e.target.value)}
                        placeholder="Merhaba! Fiyatlarimiz hakkinda bilgi almak için..."
                        rows={4}
                        data-testid="input-auto-response"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="auto-keywords-en">English Keywords (comma separated)</Label>
                      <Input
                        id="auto-keywords-en"
                        value={formKeywordsEn}
                        onChange={(e) => setFormKeywordsEn(e.target.value)}
                        placeholder="price, cost, how much"
                        data-testid="input-auto-keywords-en"
                      />
                      <p className="text-xs text-muted-foreground">
                        Optional - leave empty if no English support needed
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="auto-response-en">English Response</Label>
                      <Textarea
                        id="auto-response-en"
                        value={formResponseEn}
                        onChange={(e) => setFormResponseEn(e.target.value)}
                        placeholder="Hello! For price information..."
                        rows={4}
                        data-testid="input-auto-response-en"
                      />
                      <p className="text-xs text-muted-foreground">
                        If empty, Turkish response will be used for English queries
                      </p>
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="auto-priority">Oncelik</Label>
                    <Input
                      id="auto-priority"
                      type="number"
                      value={formPriority}
                      onChange={(e) => setFormPriority(parseInt(e.target.value) || 0)}
                      data-testid="input-auto-priority"
                    />
                    <p className="text-xs text-muted-foreground">
                      Yüksek deger = once kontrol edilir
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Durum</Label>
                    <div className="flex items-center gap-2 pt-2">
                      <Switch
                        checked={formIsActive}
                        onCheckedChange={setFormIsActive}
                        data-testid="switch-auto-active"
                      />
                      <span className="text-sm">{formIsActive ? "Aktif" : "Pasif"}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel">
                  İptal
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-auto"
                >
                  {createMutation.isPending || updateMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// === DATA EXPORT SECTION ===
function DataExportSection() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('csv');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['all']);
  
  // Import state
  const [isImporting, setIsImporting] = useState(false);
  const [importData, setImportData] = useState<any>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const { data: preview, isLoading: isLoadingPreview, refetch: refetchPreview } = useQuery<{
    summary: {
      activitiesCount: number;
      reservationsCount: number;
      agenciesCount: number;
      messagesCount: number;
      customersCount: number;
      autoResponsesCount: number;
      supportRequestsCount: number;
      holidaysCount: number;
      faqCount: number;
    };
    lastUpdated: string;
  }>({
    queryKey: ['/api/tenant-export/preview']
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const typesParam = selectedTypes.join(',');
      const response = await fetch(`/api/tenant-export?format=${exportFormat}&types=${typesParam}`);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const filename = exportFormat === 'csv' 
        ? `acenta_verileri_${new Date().toISOString().split('T')[0]}.csv`
        : `acenta_verileri_${new Date().toISOString().split('T')[0]}.json`;
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({ title: "Başarılı", description: "Veriler indirildi" });
    } catch (error) {
      toast({ title: "Hata", description: "Veriler indirilemedi", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast({ title: "Hata", description: "Sadece JSON formatında yedek dosyaları desteklenmektedir", variant: "destructive" });
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!data.exportInfo) {
        toast({ title: "Hata", description: "Geçersiz yedek dosyası formatı", variant: "destructive" });
        return;
      }

      setImportData(data);
      setShowImportConfirm(true);
    } catch (error) {
      toast({ title: "Hata", description: "Dosya okunamadı veya geçersiz JSON formatı", variant: "destructive" });
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    if (!importData) return;
    
    setIsImporting(true);
    try {
      const response = await fetch('/api/tenant-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: importData, options: { mode: importMode } })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Import failed');
      }

      setImportResult(result);
      setShowImportConfirm(false);
      refetchPreview();
      toast({ title: "Başarılı", description: result.message });
    } catch (error: any) {
      toast({ title: "Hata", description: error.message || "Veriler içe aktarılamadı", variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  const dataTypes = [
    { id: 'all', label: 'Tüm Veriler' },
    { id: 'reservations', label: 'Rezervasyonlar' },
    { id: 'activities', label: 'Aktiviteler' },
    { id: 'customers', label: 'Müşteriler' },
    { id: 'agencies', label: 'Acentalar' },
    { id: 'messages', label: 'Mesajlar' },
    { id: 'autoResponses', label: 'Otomatik Yanıtlar' },
    { id: 'supportRequests', label: 'Destek Talepleri' },
    { id: 'holidays', label: 'Tatiller' },
    { id: 'faq', label: 'SSS' },
    { id: 'settings', label: 'Bot Ayarları' },
  ];

  const toggleType = (typeId: string) => {
    if (typeId === 'all') {
      setSelectedTypes(['all']);
    } else {
      const newTypes = selectedTypes.filter(t => t !== 'all');
      if (newTypes.includes(typeId)) {
        const updated = newTypes.filter(t => t !== typeId);
        setSelectedTypes(updated.length === 0 ? ['all'] : updated);
      } else {
        setSelectedTypes([...newTypes, typeId]);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Export Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Veri Dışa Aktarma (Yedekleme)
          </CardTitle>
          <CardDescription>
            Acentanıza ait tüm verileri indirin. JSON formatında indirerek daha sonra geri yükleyebilirsiniz.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-3">Veri Özeti</h4>
            {isLoadingPreview ? (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : preview ? (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                <div className="text-center p-2 bg-background rounded-md">
                  <div className="text-xl font-bold">{preview.summary.activitiesCount}</div>
                  <div className="text-xs text-muted-foreground">Aktivite</div>
                </div>
                <div className="text-center p-2 bg-background rounded-md">
                  <div className="text-xl font-bold">{preview.summary.reservationsCount}</div>
                  <div className="text-xs text-muted-foreground">Rezervasyon</div>
                </div>
                <div className="text-center p-2 bg-background rounded-md">
                  <div className="text-xl font-bold">{preview.summary.customersCount}</div>
                  <div className="text-xs text-muted-foreground">Müşteri</div>
                </div>
                <div className="text-center p-2 bg-background rounded-md">
                  <div className="text-xl font-bold">{preview.summary.agenciesCount}</div>
                  <div className="text-xs text-muted-foreground">Acenta</div>
                </div>
                <div className="text-center p-2 bg-background rounded-md">
                  <div className="text-xl font-bold">{preview.summary.messagesCount}</div>
                  <div className="text-xs text-muted-foreground">Mesaj</div>
                </div>
                <div className="text-center p-2 bg-background rounded-md">
                  <div className="text-xl font-bold">{preview.summary.autoResponsesCount || 0}</div>
                  <div className="text-xs text-muted-foreground">Otomatik Yanıt</div>
                </div>
                <div className="text-center p-2 bg-background rounded-md">
                  <div className="text-xl font-bold">{preview.summary.supportRequestsCount || 0}</div>
                  <div className="text-xs text-muted-foreground">Destek Talebi</div>
                </div>
                <div className="text-center p-2 bg-background rounded-md">
                  <div className="text-xl font-bold">{preview.summary.holidaysCount || 0}</div>
                  <div className="text-xs text-muted-foreground">Tatil</div>
                </div>
                <div className="text-center p-2 bg-background rounded-md">
                  <div className="text-xl font-bold">{preview.summary.faqCount || 0}</div>
                  <div className="text-xs text-muted-foreground">SSS</div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Veri özeti yüklenemedi</p>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Veri Türleri</Label>
              <div className="flex flex-wrap gap-2">
                {dataTypes.map(type => (
                  <Button
                    key={type.id}
                    variant={selectedTypes.includes(type.id) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleType(type.id)}
                    data-testid={`button-type-${type.id}`}
                  >
                    {type.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Format</Label>
              <div className="flex gap-2">
                <Button
                  variant={exportFormat === 'csv' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setExportFormat('csv')}
                  data-testid="button-format-csv"
                >
                  CSV (Excel)
                </Button>
                <Button
                  variant={exportFormat === 'json' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setExportFormat('json')}
                  data-testid="button-format-json"
                >
                  JSON (Yedekleme)
                </Button>
              </div>
              {exportFormat === 'json' && (
                <p className="text-xs text-muted-foreground mt-1">
                  JSON formatındaki yedekleri daha sonra sisteme geri yükleyebilirsiniz.
                </p>
              )}
            </div>
          </div>

          <Button 
            onClick={handleExport} 
            disabled={isExporting}
            className="w-full sm:w-auto"
            data-testid="button-export-data"
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                İndiriliyor...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Verileri İndir
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Import Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Veri İçe Aktarma (Geri Yükleme)
          </CardTitle>
          <CardDescription>
            Daha önce indirdiğiniz JSON formatındaki yedek dosyasını yükleyerek verilerinizi geri yükleyin.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
            data-testid="input-import-file"
          />
          
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              JSON formatında yedek dosyası yükleyin
            </p>
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              data-testid="button-select-file"
            >
              Dosya Seç
            </Button>
          </div>

          {importResult && (
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">
                İçe Aktarma Tamamlandı
              </h4>
              <p className="text-sm text-green-700 dark:text-green-300 mb-2">
                {importResult.message}
              </p>
              {importResult.details && (
                <div className="text-xs text-green-600 dark:text-green-400 space-y-1">
                  {Object.entries(importResult.details).map(([key, value]: [string, any]) => (
                    <p key={key}>
                      {key}: {value.imported} eklendi, {value.skipped} atlandı
                      {value.errors?.length > 0 && `, ${value.errors.length} hata`}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Confirmation Dialog */}
      <Dialog open={showImportConfirm} onOpenChange={setShowImportConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Veri İçe Aktarma Onayı</DialogTitle>
            <CardDescription>
              Yedek dosyası başarıyla okundu. İçe aktarmak istediğiniz verileri onaylayın.
            </CardDescription>
          </DialogHeader>
          
          {importData && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 text-sm">
                <p><strong>Yedek Tarihi:</strong> {new Date(importData.exportInfo.exportedAt).toLocaleString('tr-TR')}</p>
                <p className="mt-2"><strong>İçerik:</strong></p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  {importData.activities && <li>{importData.activities.length} aktivite</li>}
                  {importData.reservations && <li>{importData.reservations.length} rezervasyon</li>}
                  {importData.agencies && <li>{importData.agencies.length} acenta</li>}
                </ul>
              </div>

              <div>
                <Label className="mb-2 block">İçe Aktarma Modu</Label>
                <div className="flex gap-2">
                  <Button
                    variant={importMode === 'merge' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setImportMode('merge')}
                  >
                    Birleştir
                  </Button>
                  <Button
                    variant={importMode === 'replace' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setImportMode('replace')}
                  >
                    Değiştir
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {importMode === 'merge' 
                    ? "Mevcut veriler korunur, sadece yeni veriler eklenir."
                    : "Mevcut veriler üzerine yazılır."}
                </p>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowImportConfirm(false)}>
                  İptal
                </Button>
                <Button onClick={handleImport} disabled={isImporting}>
                  {isImporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      İçe Aktarılıyor...
                    </>
                  ) : (
                    "İçe Aktar"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">Yedekleme ve Geri Yükleme Hakkında</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-300">
                <li>Verilerinizi düzenli olarak JSON formatında yedeklemenizi öneririz</li>
                <li>Geri yükleme işlemi sadece aynı acentaya ait yedekleri kabul eder</li>
                <li>Birleştir modu mevcut verileri korur, Değiştir modu üzerine yazar</li>
                <li>Rezervasyonlar aktivite adlarına göre eşleştirilir</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// === HOLIDAYS SECTION ===
const HOLIDAY_TYPES = [
  { value: 'official', label: 'Resmi Tatil' },
  { value: 'religious', label: 'Dini Bayram' },
  { value: 'special', label: 'Özel Gun' },
];

const PRESET_HOLIDAYS_2026 = [
  { name: "Yılbaşı", startDate: "2026-01-01", endDate: "2026-01-01", type: "official", keywords: '["yılbaşı", "yeni yıl", "1 ocak"]' },
  { name: "23 Nisan Ulusal Egemenlik ve Cocuk Bayrami", startDate: "2026-04-23", endDate: "2026-04-23", type: "official", keywords: '["23 nisan", "cocuk bayrami"]' },
  { name: "1 Mayıs Emek ve Dayanisma Gunu", startDate: "2026-05-01", endDate: "2026-05-01", type: "official", keywords: '["1 mayıs", "isci bayrami"]' },
  { name: "19 Mayıs Ataturku Anma Genclik ve Spor Bayrami", startDate: "2026-05-19", endDate: "2026-05-19", type: "official", keywords: '["19 mayıs", "genclik bayrami"]' },
  { name: "15 Temmuz Demokrasi ve Milli Birlik Gunu", startDate: "2026-07-15", endDate: "2026-07-15", type: "official", keywords: '["15 temmuz"]' },
  { name: "30 Ağustos Zafer Bayrami", startDate: "2026-08-30", endDate: "2026-08-30", type: "official", keywords: '["30 ağustos", "zafer bayrami"]' },
  { name: "29 Ekim Cumhuriyet Bayrami", startDate: "2026-10-29", endDate: "2026-10-29", type: "official", keywords: '["29 ekim", "cumhuriyet bayrami"]' },
  { name: "Ramazan Bayrami 2026", startDate: "2026-03-20", endDate: "2026-03-22", type: "religious", keywords: '["ramazan bayrami", "seker bayrami"]' },
  { name: "Kurban Bayrami 2026", startDate: "2026-05-27", endDate: "2026-05-30", type: "religious", keywords: '["kurban bayrami", "bayram"]' },
];

function HolidaysSection() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [formName, setFormName] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formType, setFormType] = useState("official");
  const [formKeywords, setFormKeywords] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  const { data: holidays = [], isLoading } = useQuery<Holiday[]>({
    queryKey: ['/api/holidays']
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => apiRequest('POST', '/api/holidays', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/holidays'] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Başarılı", description: "Tatil eklendi." });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => apiRequest('PATCH', `/api/holidays/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/holidays'] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Başarılı", description: "Tatil güncellendi." });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest('DELETE', `/api/holidays/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/holidays'] });
      toast({ title: "Başarılı", description: "Tatil silindi." });
    }
  });

  const resetForm = () => {
    setEditingHoliday(null);
    setFormName("");
    setFormStartDate("");
    setFormEndDate("");
    setFormType("official");
    setFormKeywords("");
    setFormNotes("");
    setFormIsActive(true);
  };

  const openEditDialog = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setFormName(holiday.name);
    setFormStartDate(holiday.startDate);
    setFormEndDate(holiday.endDate);
    setFormType(holiday.type || "official");
    try {
      const kw = JSON.parse(holiday.keywords || '[]');
      setFormKeywords(Array.isArray(kw) ? kw.join(', ') : '');
    } catch { setFormKeywords(''); }
    setFormNotes(holiday.notes || '');
    setFormIsActive(holiday.isActive ?? true);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName || !formStartDate) {
      toast({ title: "Hata", description: "Tatil adı ve başlangıç tarihi zorunludur.", variant: "destructive" });
      return;
    }
    const keywordsArray = formKeywords.split(',').map(k => k.trim()).filter(k => k);
    const data = {
      name: formName,
      startDate: formStartDate,
      endDate: formEndDate || formStartDate,
      type: formType,
      keywords: JSON.stringify(keywordsArray),
      notes: formNotes,
      isActive: formIsActive
    };
    if (editingHoliday) {
      await updateMutation.mutateAsync({ id: editingHoliday.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleImportPresets = async () => {
    if (!confirm("2026 yılı için varsayılan tatilleri eklemek istiyor musunuz?")) return;
    let added = 0;
    for (const preset of PRESET_HOLIDAYS_2026) {
      try {
        await createMutation.mutateAsync({ ...preset, isActive: true, notes: '' });
        added++;
      } catch {}
    }
    toast({ title: "Başarılı", description: `${added} tatil eklendi.` });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <CalendarHeart className="h-5 w-5" />
            Tatil ve Bayram Yönetimi
          </CardTitle>
          <CardDescription>Resmi tatiller ve bayramları yönetin. Bot müsaitlik kontrolünde bu tarihleri dikkate alır.</CardDescription>
        </div>
        <div className="flex gap-2">
          {holidays.length === 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleImportPresets} data-testid="button-import-holidays">
                  2026 Tatillerini Ekle
                </Button>
              </TooltipTrigger>
              <TooltipContent>Hazır tatil listesini içe aktar</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" onClick={() => { resetForm(); setIsDialogOpen(true); }} data-testid="button-add-holiday">
                <Plus className="h-4 w-4 mr-1" />
                Yeni Tatil
              </Button>
            </TooltipTrigger>
            <TooltipContent>Yeni tatil ekle</TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : holidays.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
            Henüz tatil eklenmemiş. "2026 Tatillerini Ekle" butonuna tıklayarak başlayabilirsiniz.
          </div>
        ) : (
          <div className="space-y-2">
            {holidays.map((holiday) => {
              const typeLabel = HOLIDAY_TYPES.find(t => t.value === holiday.type)?.label || holiday.type;
              const isMultiDay = holiday.startDate !== holiday.endDate;
              return (
                <div key={holiday.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 gap-3" data-testid={`row-holiday-${holiday.id}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{holiday.name}</span>
                      <Badge variant="outline" className="shrink-0">{typeLabel}</Badge>
                      {!holiday.isActive && <Badge variant="secondary" className="shrink-0">Pasif</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {isMultiDay ? `${formatDate(holiday.startDate)} - ${formatDate(holiday.endDate)}` : formatDate(holiday.startDate)}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(holiday)} data-testid={`button-edit-holiday-${holiday.id}`}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Tatili düzenle</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(holiday.id)} data-testid={`button-delete-holiday-${holiday.id}`}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Tatili sil</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingHoliday ? 'Tatil Düzenle' : 'Yeni Tatil Ekle'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tatil Adı *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ornegin: Kurban Bayrami" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Başlangıç Tarihi *</Label>
                <Input type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Bitiş Tarihi</Label>
                <Input type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tatil Tipi</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HOLIDAY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Anahtar Kelimeler</Label>
              <Input value={formKeywords} onChange={(e) => setFormKeywords(e.target.value)} placeholder="bayram, tatil, kurban (virgullerle ayirin)" />
              <p className="text-xs text-muted-foreground">Bot bu kelimeleri algiladiginda tatil bilgisi verir</p>
            </div>
            <div className="space-y-2">
              <Label>Notlar</Label>
              <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Opsiyonel notlar" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
              <Label>Aktif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>İptal</Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Tatili kaydet</TooltipContent>
            </Tooltip>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// === REQUEST MESSAGE TEMPLATES SECTION ===
interface RequestMessageTemplate {
  id: number;
  name: string;
  templateType: string;
  messageContent: string;
  isDefault: boolean | null;
  isActive: boolean | null;
  createdAt: string | null;
}

function RequestMessageTemplatesSection() {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { data: templates, refetch } = useQuery<RequestMessageTemplate[]>({
    queryKey: ['/api/request-message-templates'],
  });

  const handleEdit = (template: RequestMessageTemplate) => {
    setEditingId(template.id);
    setEditName(template.name);
    setEditType(template.templateType);
    setEditContent(template.messageContent);
  };

  const handleSave = async () => {
    if (!editingId) return;
    setIsSaving(true);
    try {
      await apiRequest('PATCH', `/api/request-message-templates/${editingId}`, {
        name: editName,
        templateType: editType,
        messageContent: editContent
      });
      toast({ title: "Başarılı", description: "Şablon güncellendi." });
      setEditingId(null);
      refetch();
    } catch (err) {
      toast({ title: "Hata", description: "Şablon güncellenemedi.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditName("");
    setEditType("");
    setEditContent("");
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'approved': return 'Onaylandı';
      case 'pending': return 'Değerlendiriliyor';
      case 'rejected': return 'Reddedildi';
      default: return type;
    }
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'approved': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'rejected': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      default: return '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h4 className="font-medium">Talep Mesaj Şablonları</h4>
        <p className="text-sm text-muted-foreground">
          Müşteri taleplerine yanıt verirken kullanılacak hazır mesaj şablonları
        </p>
      </div>

      <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-2">
        <p className="font-medium">Kullanılabilir Değişkenler:</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div><code className="bg-background px-1.5 py-1 rounded">{'{'}müşteri_adi{'}'}</code> - Müşteri adı</div>
          <div><code className="bg-background px-1.5 py-1 rounded">{'{'}talep_turu{'}'}</code> - Talep türü</div>
          <div><code className="bg-background px-1.5 py-1 rounded">{'{'}yeni_saat{'}'}</code> - Yeni saat (saat değişikliği için)</div>
          <div><code className="bg-background px-1.5 py-1 rounded">{'{'}red_sebebi{'}'}</code> - Ret sebebi</div>
        </div>
      </div>

      <div className="space-y-3">
        {templates?.map((template) => (
          <Card key={template.id} className="p-4">
            {editingId === template.id ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Şablon Adı</Label>
                    <Input 
                      value={editName} 
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Şablon adı"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Şablon Tipi</Label>
                    <Select value={editType} onValueChange={setEditType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="approved">Onaylandı</SelectItem>
                        <SelectItem value="pending">Değerlendiriliyor</SelectItem>
                        <SelectItem value="rejected">Reddedildi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Mesaj İçeriği</Label>
                  <Textarea 
                    value={editContent} 
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-[150px]"
                    placeholder="Mesaj içeriği..."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSaving}>
                    İptal
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? "Kaydediliyor..." : "Kaydet"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{template.name}</span>
                    <Badge className={getTypeBadgeClass(template.templateType)}>
                      {getTypeLabel(template.templateType)}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(template)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
                <pre className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded-lg">
                  {template.messageContent}
                </pre>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

// === BOT TEST SECTION ===
function BotTestSection() {
  const { toast } = useToast();
  const [phone, setPhone] = useState("+90532");
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!phone || !message.trim()) {
      toast({ title: "Hata", description: "Telefon ve mesaj gereklidir.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/webhooks/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          From: phone,
          Body: message,
        }),
      });

      if (!res.ok) throw new Error("Bot yanit veremedi");

      const responseText = await res.text();
      
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(responseText, "text/xml");
      const messageContent = xmlDoc.getElementsByTagName("Message")[0]?.textContent || responseText;

      setHistory([
        ...history,
        { role: "user", content: message },
        { role: "assistant", content: messageContent },
      ]);
      setMessage("");
      
      toast({ title: "Başarılı", description: "Bot yanıt verdi." });
    } catch (error) {
      toast({ 
        title: "Hata", 
        description: "Bot test edilirken hata oluştu.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Chat Area */}
      <div className="lg:col-span-2 space-y-4">
        {/* Chat Messages */}
        <div className="border rounded-lg p-4 h-64 overflow-y-auto space-y-3 bg-muted/30">
          {history.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center text-muted-foreground">
              <div>
                <p className="text-sm font-semibold mb-1">Henüz mesaj yok</p>
                <p className="text-xs">Botu test etmek için aşağıda bir mesaj yazın</p>
              </div>
            </div>
          ) : (
            <>
              {history.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-none"
                        : "bg-muted text-foreground rounded-bl-none"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="test-phone" className="text-xs">Telefon</Label>
              <Input
                id="test-phone"
                placeholder="+905321234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="text-sm"
                data-testid="input-bot-test-phone"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleSend}
                disabled={loading}
                className="w-full"
                data-testid="button-bot-test-send"
              >
                {loading ? "Gönderiliyor..." : "Gönder"}
              </Button>
            </div>
          </div>
          <div>
            <Label htmlFor="test-message" className="text-xs">Mesaj</Label>
            <Textarea
              id="test-message"
              placeholder="Botunuza göndermek istediğiniz mesajı yazın..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.ctrlKey) {
                  handleSend();
                }
              }}
              className="h-16 text-sm"
              data-testid="input-bot-test-message"
            />
          </div>
        </div>
      </div>

      {/* Bot Info */}
      <div className="space-y-4">
        <div className="border rounded-lg p-4 bg-muted/30">
          <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Bot Bilgisi
          </h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Model</span>
              <Badge variant="secondary" className="text-xs">Gemini 1.5 Flash</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dil</span>
              <span className="font-medium">Türkçe / English</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Durum</span>
              <span className="flex items-center gap-1 font-medium text-green-600">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                Aktif
              </span>
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-3 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <h4 className="font-bold text-blue-900 dark:text-blue-100 text-xs mb-2">Ipuclari</h4>
          <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
            <li>Turkce olarak sorular sorun</li>
            <li>Bot aktiviteleri ve kapasiteyi gorebilir</li>
            <li>Rezervasyon yapabilir</li>
            <li>Ctrl+Enter ile hızlı gönder</li>
          </ul>
        </div>

        {history.length > 0 && (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full text-xs"
            onClick={() => setHistory([])}
            data-testid="button-clear-chat"
          >
            Sohbeti Temizle
          </Button>
        )}
      </div>
    </div>
  );
}

// === USER MANAGEMENT SECTION ===
interface TenantUser {
  id: number;
  tenantId: number | null;
  username: string;
  email: string;
  name: string | null;
  phone: string | null;
  isActive: boolean;
  roles?: { roleId: number; role?: { name: string } }[];
}

interface Role {
  id: number;
  name: string;
  displayName: string;
  description: string | null;
  color?: string;
}

function UserManagementSection() {
  const { toast } = useToast();
  const [editingUser, setEditingUser] = useState<TenantUser | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [userForm, setUserForm] = useState({
    username: "",
    email: "",
    password: "",
    name: "",
    phone: "",
    roleIds: [] as number[],
  });

  // Get current user id from localStorage
  useEffect(() => {
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setCurrentUserId(user.id);
      } catch {
        setCurrentUserId(null);
      }
    }
  }, []);

  // SECURITY: We use the session tenant ID on the server, not client-provided values
  const { data: users = [], isLoading, refetch } = useQuery<TenantUser[]>({
    queryKey: ['/api/tenant-users'],
  });

  const { data: allRoles = [] } = useQuery<Role[]>({
    queryKey: ['/api/roles'],
  });

  // Filter to only show tenant-specific roles (Manager, Operator, Viewer)
  // Owner role is only assigned automatically when tenant is created
  // Viewer role is for partner agencies with limited access
  const tenantRoles = allRoles.filter(r => 
    r.name === 'tenant_manager' || r.name === 'tenant_operator' || r.name === 'viewer'
  );

  const createUserMutation = useMutation({
    mutationFn: async (data: typeof userForm) => {
      const res = await apiRequest('POST', '/api/tenant-users', data);
      return res;
    },
    onSuccess: () => {
      refetch();
      setEditingUser(null);
      setIsNewUser(false);
      toast({ title: "Başarılı", description: "Kullanıcı oluşturuldu" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Kullanıcı oluşturulamadi", variant: "destructive" });
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<typeof userForm> }) => {
      const res = await apiRequest('PATCH', `/api/tenant-users/${id}`, data);
      return res;
    },
    onSuccess: () => {
      refetch();
      setEditingUser(null);
      toast({ title: "Başarılı", description: "Kullanıcı güncellendi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Kullanıcı güncellenemedi", variant: "destructive" });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/tenant-users/${id}`),
    onSuccess: () => {
      refetch();
      toast({ title: "Başarılı", description: "Kullanıcı silindi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Kullanıcı silinemedi", variant: "destructive" });
    }
  });

  const resetForm = () => {
    setUserForm({
      username: "",
      email: "",
      password: "",
      name: "",
      phone: "",
      roleIds: [],
    });
  };

  const openNewUserDialog = () => {
    resetForm();
    setIsNewUser(true);
    setEditingUser({ id: 0 } as TenantUser);
  };

  const openEditUserDialog = (user: TenantUser) => {
    setUserForm({
      username: user.username,
      email: user.email,
      password: "",
      name: user.name || "",
      phone: user.phone || "",
      roleIds: user.roles?.map(r => r.roleId) || [],
    });
    setIsNewUser(false);
    setEditingUser(user);
  };

  const handleSaveUser = () => {
    if (isNewUser) {
      createUserMutation.mutate({ ...userForm });
    } else if (editingUser?.id) {
      const updateData: any = { ...userForm };
      if (!updateData.password) {
        delete updateData.password;
      }
      updateUserMutation.mutate({ id: editingUser.id, data: updateData });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Kullanıcı Yönetimi
          </CardTitle>
          <CardDescription>
            Acentaniz için kullanıcı hesaplarini yonetin
          </CardDescription>
        </div>
        <Button onClick={openNewUserDialog} data-testid="button-new-user">
          <UserPlus className="h-4 w-4 mr-2" />
          Yeni Kullanıcı
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Henuz kullanıcı bulunmuyor. Yeni kullanıcı eklemek için butona tıklayın.
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                data-testid={`user-row-${user.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">{user.name || user.username}</div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={user.isActive ? "default" : "secondary"}>
                    {user.isActive ? "Aktif" : "Pasif"}
                  </Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openEditUserDialog(user)}
                    data-testid={`button-edit-user-${user.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {user.id !== currentUserId && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`"${user.name || user.username}" kullanıcısini silmek istediğinizden emin misiniz?`)) {
                          deleteUserMutation.mutate(user.id);
                        }
                      }}
                      data-testid={`button-delete-user-${user.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{isNewUser ? "Yeni Kullanıcı Ekle" : "Kullanıcı Düzenle"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="username">Kullanıcı Adı *</Label>
                <Input
                  id="username"
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  placeholder="Kullanıcı adi"
                  disabled={!isNewUser}
                  data-testid="input-user-username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-posta *</Label>
                <Input
                  id="email"
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="ornek@email.com"
                  data-testid="input-user-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Ad Soyad</Label>
                <Input
                  id="name"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  placeholder="Ad Soyad"
                  data-testid="input-user-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  value={userForm.phone}
                  onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                  placeholder="+90 5XX XXX XX XX"
                  data-testid="input-user-phone"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{isNewUser ? "Şifre *" : "Yeni Şifre (boş birakilabilir)"}</Label>
                <Input
                  id="password"
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder={isNewUser ? "Şifre girin" : "Değiştirmek için yeni şifre"}
                  data-testid="input-user-password"
                />
              </div>

              {tenantRoles.length > 0 && (
                <div className="space-y-2">
                  <Label>Rol</Label>
                  <p className="text-xs text-muted-foreground">
                    Yönetiçi: Aktivite, bot, finans ve kullanıcı yönetimi. Operator: Rezervasyon ve mesajlar.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {tenantRoles.map((role) => (
                      <Badge
                        key={role.id}
                        variant={userForm.roleIds.includes(role.id) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          if (userForm.roleIds.includes(role.id)) {
                            setUserForm({ ...userForm, roleIds: userForm.roleIds.filter(id => id !== role.id) });
                          } else {
                            setUserForm({ ...userForm, roleIds: [...userForm.roleIds, role.id] });
                          }
                        }}
                        data-testid={`badge-role-${role.id}`}
                      >
                        {role.displayName || role.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingUser(null)}>
                İptal
              </Button>
              <Button
                onClick={handleSaveUser}
                disabled={
                  !userForm.username || !userForm.email ||
                  (isNewUser && !userForm.password) ||
                  createUserMutation.isPending || updateUserMutation.isPending
                }
                data-testid="button-save-user"
              >
                {(createUserMutation.isPending || updateUserMutation.isPending) ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
